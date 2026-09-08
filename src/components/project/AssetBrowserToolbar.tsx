"use client";

import { ProjectFilters } from "./ProjectFilters";
import type { FilterState } from "@/lib/filters";
import type { CardFieldId } from "@/lib/cardFields";
import type {
  AssetClass,
  CardAspectRatio,
  FolderSortKey,
  GridSize,
  GroupByField,
  SortKey,
  ThumbnailScale,
  WorkspaceLayout,
} from "@/lib/types";

export function AssetBrowserToolbar(props: {
  layout: WorkspaceLayout;
  gridSize: GridSize;
  aspectRatio: CardAspectRatio;
  thumbnailScale: ThumbnailScale;
  showCardInfo: boolean;
  assetClassCounts: Record<"all" | AssetClass, number>;
  filters: FilterState;
  sort: SortKey;
  folderSort?: FolderSortKey;
  showFolderSort?: boolean;
  groupBy: GroupByField;
  visibleFields: CardFieldId[];
  fieldOrder: CardFieldId[];
  onFolderSort?: (sort: FolderSortKey) => void;
  onLayout: (layout: WorkspaceLayout) => void;
  onGridSize: (size: GridSize) => void;
  onAspectRatio: (ratio: CardAspectRatio) => void;
  onThumbnailScale: (scale: ThumbnailScale) => void;
  onShowCardInfo: (show: boolean) => void;
  onFilters: (f: FilterState) => void;
  onSort: (s: SortKey) => void;
  onGroupBy: (group: GroupByField) => void;
  onVisibleFieldsChange: (visible: CardFieldId[], order: CardFieldId[]) => void;
  panelToggles?: React.ReactNode;
}) {
  return (
    <div className="w-full min-w-0">
      <ProjectFilters {...props} />
    </div>
  );
}
