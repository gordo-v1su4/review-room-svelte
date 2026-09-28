"""Provision the private Review Room bucket from RustFS VM using a root-only stdin payload.

Run on the RustFS host. The JSON input contains the already-vaulted scoped key pair
and storage-policy.json; this script never writes or prints the credential values.
"""

import json
import hashlib
import subprocess
import sys
import urllib.request
import urllib.error

import boto3
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from botocore.config import Config
from botocore.credentials import Credentials
from botocore.exceptions import ClientError

BUCKET = "review-room-svelte"
ENDPOINT = "http://127.0.0.1:9000"


def root_credentials():
    container = json.loads(subprocess.check_output(["docker", "inspect", "rustfs-server"]))[0]
    env = dict(entry.split("=", 1) for entry in container["Config"]["Env"] if "=" in entry)
    return env["RUSTFS_ACCESS_KEY"], env["RUSTFS_SECRET_KEY"]


def client(access_key, secret_key):
    return boto3.client(
        "s3",
        endpoint_url=ENDPOINT,
        region_name="us-east-1",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(s3={"addressing_style": "path"}),
    )


def admin_put(root_key, root_secret, path, payload):
    data = json.dumps(payload, separators=(",", ":")).encode()
    url = ENDPOINT + path
    request = AWSRequest(method="PUT", url=url, data=data, headers={
        "Content-Type": "application/json",
        "x-amz-content-sha256": hashlib.sha256(data).hexdigest(),
    })
    SigV4Auth(Credentials(root_key, root_secret), "s3", "us-east-1").add_auth(request)
    with urllib.request.urlopen(urllib.request.Request(url, data=data, method="PUT", headers=dict(request.headers)), timeout=15) as response:
        response.read()
        return response.status


def main():
    payload = json.load(sys.stdin)
    access_key, secret_key = payload["accessKey"], payload["secretKey"]
    policy = payload["policy"]
    if not access_key.startswith("RR") or not 32 <= len(secret_key) <= 40:
        raise ValueError("Unexpected scoped credential format")
    root_key, root_secret = root_credentials()
    root = client(root_key, root_secret)
    try:
        root.head_bucket(Bucket=BUCKET)
    except ClientError as error:
        if error.response["ResponseMetadata"]["HTTPStatusCode"] != 404:
            raise
        root.create_bucket(Bucket=BUCKET)
    try:
        root.get_bucket_policy(Bucket=BUCKET)
    except ClientError as error:
        if error.response["Error"]["Code"] not in ("NoSuchBucketPolicy", "NoSuchPolicy", "404"):
            raise
    else:
        raise RuntimeError("Bucket already has a policy; refusing to alter it")
    try:
        status = admin_put(root_key, root_secret, "/rustfs/admin/v3/add-service-account", {
            "accessKey": access_key,
            "secretKey": secret_key,
            "name": "review-room-svelte-app",
            "description": "Private Review Room originals and derivatives",
            "policy": policy,
        })
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="replace").replace(access_key, "<key>").replace(secret_key, "<secret>")
        raise RuntimeError(f"RustFS admin returned {error.code}: {detail[:500]}") from None
    scoped = client(access_key, secret_key)
    key, body = "assets/provision-check.txt", b"review-room-svelte isolated storage check\n"
    scoped.put_object(Bucket=BUCKET, Key=key, Body=body)
    got = scoped.get_object(Bucket=BUCKET, Key=key)["Body"].read()
    ranged = scoped.get_object(Bucket=BUCKET, Key=key, Range="bytes=0-5")["Body"].read()
    if got != body or ranged != body[:6]:
        raise RuntimeError("Scoped storage readback failed")
    scoped.delete_object(Bucket=BUCKET, Key=key)
    print(json.dumps({"bucket": BUCKET, "adminStatus": status, "readback": True, "range": True}))


if __name__ == "__main__":
    main()
