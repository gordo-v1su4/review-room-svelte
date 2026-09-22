<script lang="ts">
  import { ChevronDown, ChevronRight, Folder, Image, Plus, Video, Bookmark, Archive, Layers, ListFilter } from 'lucide-svelte';

  export type ProjectTreeCollection = 'all' | 'video' | 'image' | 'selected';
  export type ProjectTreeProject = Readonly<{
    id: string;
    name: string;
    videoCount: number;
    imageCount: number;
    shortlistCount: number;
    archivedCount?: number;
    collections?: readonly { id: string; title: string; count: number }[];
    folders?: readonly { id: string; title: string; count: number }[];
  }>;

  let {
    projects = [],
    selectedProjectId,
    selectedCollection = 'all',
    onOpen,
    onCreate,
    selectedFolderId = null,
    selectedCustomCollectionId = null,
    onCollection,
    archived = false,
    overview = false,
    onFolder,
    onArchive,
    onProject,
  }: {
    projects: readonly ProjectTreeProject[];
    selectedProjectId?: string;
    selectedCollection?: ProjectTreeCollection;
    onOpen: (projectId: string, collection: ProjectTreeCollection) => void;
    onCreate: () => void;
    selectedFolderId?: string | null;
    selectedCustomCollectionId?: string | null;
    onCollection?: (projectId: string, collectionId: string) => void;
    archived?: boolean;
    overview?: boolean;
    onFolder?: (projectId: string, folderId: string) => void;
    onArchive?: (projectId: string) => void;
    onProject?: (projectId: string) => void;
  } = $props();

  let collapsed = $state<Set<string>>(new Set());

  function toggle(projectId: string) {
    const next = new Set(collapsed);
    if (next.has(projectId)) next.delete(projectId); else next.add(projectId);
    collapsed = next;
  }
</script>

<nav class="project-tree" aria-label="Projects">
  <div class="tree-heading">
    <span>Projects</span>
    <button class="add-project" type="button" aria-label="Add project" title="Add project" onclick={onCreate}>
      <Plus size={15} strokeWidth={1.8} />
    </button>
  </div>

  {#if projects.length}
    <ul class="project-list">
      {#each projects as project (project.id)}
        {@const isExpanded = !collapsed.has(project.id)}
        {@const isSelected = selectedProjectId === project.id}
        <li class="project-node">
          <div class="project-row" class:selected={isSelected && overview}>
            <button
              class="disclosure"
              type="button"
              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${project.name}`}
              aria-expanded={isExpanded}
              onclick={() => toggle(project.id)}
            >
              {#if isExpanded}<ChevronDown size={14} />{:else}<ChevronRight size={14} />{/if}
            </button>
            <button class="project-link" type="button" onclick={() => onProject ? onProject(project.id) : onOpen(project.id, 'all')}>
              <Folder size={15} strokeWidth={1.8} />
              <span class="project-name" title={project.name}>{project.name}</span>
              <span class="count">{project.videoCount + project.imageCount}</span>
            </button>
          </div>

          {#if isExpanded}
            <ul class="collection-list" aria-label={`${project.name} collections`}>
              <li><button class="collection-link" class:selected={isSelected && !selectedCustomCollectionId && !overview && !selectedFolderId && !archived && selectedCollection === 'all'} type="button" onclick={() => onOpen(project.id, 'all')}><Layers size={14}/><span>All media</span></button></li>
              {#each project.folders ?? [] as folder (folder.id)}
                <li><button class="collection-link" class:selected={isSelected && selectedFolderId === folder.id} type="button" onclick={() => onFolder?.(project.id, folder.id)}><Folder size={14}/><span>{folder.title}</span><span class="count">{folder.count}</span></button></li>
              {/each}
              <li>
                <button class:selected={isSelected && !selectedCustomCollectionId && !selectedFolderId && !archived && selectedCollection === 'video'} class="collection-link" type="button" onclick={() => onOpen(project.id, 'video')}>
                  <Video size={14} strokeWidth={1.8} /><span>Videos</span><span class="count">{project.videoCount}</span>
                </button>
              </li>
              <li>
                <button class:selected={isSelected && !selectedCustomCollectionId && !selectedFolderId && !archived && selectedCollection === 'image'} class="collection-link" type="button" onclick={() => onOpen(project.id, 'image')}>
                  <Image size={14} strokeWidth={1.8} /><span>Images</span><span class="count">{project.imageCount}</span>
                </button>
              </li>
              <li>
                <button class:selected={isSelected && !selectedCustomCollectionId && !selectedFolderId && !archived && selectedCollection === 'selected'} class="collection-link" type="button" onclick={() => onOpen(project.id, 'selected')}>
                  <Bookmark size={14} strokeWidth={1.8} /><span>Shortlist</span><span class="count">{project.shortlistCount}</span>
                </button>
              </li>
              {#each project.collections ?? [] as collection (collection.id)}
                <li><button class="collection-link" class:selected={isSelected && selectedCustomCollectionId === collection.id} aria-current={isSelected && selectedCustomCollectionId === collection.id ? 'page' : undefined} type="button" onclick={() => onCollection?.(project.id, collection.id)}><ListFilter size={14}/><span>{collection.title}</span><span class="count">{collection.count}</span></button></li>
              {/each}
              {#if project.archivedCount}<li><button class="collection-link" class:selected={isSelected && archived} type="button" onclick={() => onArchive?.(project.id)}><Archive size={14}/><span>Archived</span><span class="count">{project.archivedCount}</span></button></li>{/if}
            </ul>
          {/if}
        </li>
      {/each}
    </ul>
  {:else}
    <p class="empty">No projects yet.</p>
  {/if}
</nav>

<style>
  .project-tree { color: #aeb7b5; font-size: 12px; }
  .tree-heading { display: flex; align-items: center; justify-content: space-between; margin: 0 8px 9px 10px; color: #7f8987; font-size: 10px; font-weight: 650; letter-spacing: .13em; text-transform: uppercase; }
  .add-project, .disclosure { display: grid; place-items: center; width: 27px; height: 27px; border-radius: 7px; color: #899491; }
  .add-project:hover, .disclosure:hover { background: #ffffff09; color: #d7e3df; }
  .project-list, .collection-list { padding: 0; margin: 0; list-style: none; }
  .project-node { position: relative; }
  .project-row { display: flex; align-items: center; min-height: 38px; border-radius: 8px; }
  .project-row.selected { background: linear-gradient(100deg, #23483eaa, #23483e1c); color: #d3e7e0; }
  .project-link, .collection-link { min-width: 0; display: flex; align-items: center; gap: 9px; width: 100%; min-height: 34px; padding: 0 9px 0 3px; border: 0; background: none; color: inherit; text-align: left; }
  .project-link { font-weight: 560; }
  .project-link:hover, .collection-link:hover { color: #dbe8e4; }
  .project-name, .collection-link span:not(.count) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .count { flex-shrink: 0; margin-left: auto; min-width: 20px; padding: 2px 5px; border-radius: 5px; background: #ffffff08; color: #77827f; font-size: 10px; text-align: center; }
  .collection-list { position: relative; margin: 1px 0 7px 18px; padding-left: 17px; }
  .collection-list::before { content: ''; position: absolute; top: -3px; bottom: 9px; left: 2px; border-left: 1px solid #ffffff12; }
  .collection-list li { position: relative; }
  .collection-list li::before { content: ''; position: absolute; top: 17px; left: -15px; width: 12px; border-top: 1px solid #ffffff12; }
  .collection-link { min-height: 31px; padding-left: 6px; color: #899491; border-radius: 7px; }
  .collection-link.selected { background: #ffffff0a; color: #a8ded2; }
  .empty { margin: 0 10px; color: #687371; font-size: 11px; }
  @media (pointer: coarse) { .project-link, .collection-link, .add-project, .disclosure { min-height: 44px; } .add-project, .disclosure { min-width: 44px; } }
</style>
