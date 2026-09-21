import { useMutation, useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { useRef, useState } from "react";
import { Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaGridSkeleton } from "@/components/loading-skeletons";
import { useAccess } from "@/hooks/useAccess";
import { cn } from "@/utils/cn";
import { EntityImage } from "@/components/default-entity-image";

const UPLOAD_MEDIA = gql`
  mutation EntityImageUpload($input: CreateMediaAssetInput!) {
    createMediaAsset(input: $input) {
      url
    }
  }
`;

const MEDIA_LIBRARY = gql`
  query EntityImageLibrary($entityType: MediaEntityType, $search: String) {
    mediaAssets(entityType: $entityType, search: $search) {
      id
      url
      filename
      altText
      entityType
    }
  }
`;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

type MediaEntityType = "BUSINESS" | "PRODUCT" | "SERVICE" | "EMPLOYEE" | "CUSTOMER";

type Props = {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  /** When set, the library picker defaults to this entity type filter */
  libraryEntityType?: MediaEntityType;
};

export function EntityImageField({
  value,
  onChange,
  label = "Image",
  libraryEntityType,
}: Props) {
  const { can } = useAccess();
  const canReadLibrary = can("media.read");
  const canUploadLibrary = can("media.manage");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryFilter, setLibraryFilter] = useState<"ALL" | MediaEntityType>(
    libraryEntityType ?? "ALL",
  );
  const [createMedia] = useMutation<{ createMediaAsset?: { url: string } }>(UPLOAD_MEDIA);

  const { data: libraryData, loading: libraryLoading } = useQuery<{
    mediaAssets?: {
      id: string;
      url: string;
      filename: string;
      altText?: string | null;
      entityType?: string | null;
    }[];
  }>(MEDIA_LIBRARY, {
    skip: !libraryOpen || !canReadLibrary,
    variables: {
      entityType: libraryFilter === "ALL" ? undefined : libraryFilter,
      search: librarySearch.trim() || undefined,
    },
  });

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const dataBase64 = await fileToBase64(file);
      if (canUploadLibrary) {
        const result = await createMedia({
          variables: {
            input: {
              filename: file.name,
              mimeType: file.type,
              dataBase64,
            },
          },
        });
        const url = result.data?.createMediaAsset?.url;
        if (url) onChange(url);
      } else {
        onChange(dataBase64);
      }
    } finally {
      setUploading(false);
    }
  }

  function openLibrary() {
    setLibraryFilter(libraryEntityType ?? "ALL");
    setLibrarySearch("");
    setLibraryOpen(true);
  }

  function selectFromLibrary(url: string) {
    onChange(url);
    setLibraryOpen(false);
  }

  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <EntityImage
        src={value || undefined}
        alt={label}
        className="size-24 rounded-md border"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Uploading…" : "Upload"}
        </Button>
        {canReadLibrary ? (
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={openLibrary}>
            <Images className="size-3.5" />
            Choose from library
          </Button>
        ) : null}
        {value ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
            Remove
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Upload a new file or pick an existing image from your media library.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />

      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent className="max-h-[85vh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b p-4 pb-3">
            <DialogTitle>Media library</DialogTitle>
            <DialogDescription>Select an image for this record.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2 border-b px-4 py-3">
            <Input
              className="min-w-[180px] flex-1"
              placeholder="Search filename or alt text"
              value={librarySearch}
              onChange={(e) => setLibrarySearch(e.target.value)}
            />
            <select
              className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
              value={libraryFilter}
              onChange={(e) => setLibraryFilter(e.target.value as "ALL" | MediaEntityType)}
            >
              <option value="ALL">All types</option>
              <option value="PRODUCT">Products</option>
              <option value="SERVICE">Services</option>
              <option value="BUSINESS">Business</option>
              <option value="EMPLOYEE">Employees</option>
              <option value="CUSTOMER">Customers</option>
            </select>
          </div>
          <div className="max-h-[50vh] overflow-y-auto p-4">
            {libraryLoading ? (
              <MediaGridSkeleton count={6} />
            ) : (libraryData?.mediaAssets ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No images found. Upload one first.</p>
            ) : (
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {(libraryData?.mediaAssets ?? []).map((item) => {
                  const selected = value === item.url;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={cn(
                          "w-full overflow-hidden rounded-lg border text-left transition-colors hover:ring-2 hover:ring-ring",
                          selected && "ring-2 ring-primary",
                        )}
                        onClick={() => selectFromLibrary(item.url)}
                      >
                        <div className="aspect-square bg-muted">
                          <EntityImage
                            src={item.url}
                            alt={item.altText ?? item.filename}
                            className="size-full"
                          />
                        </div>
                        <p className="truncate px-1.5 py-1 text-[11px]" title={item.filename}>
                          {item.filename}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function EntityImageThumb({ url, name }: { url?: string | null; name: string }) {
  return (
    <EntityImage src={url} alt={name} className="size-10 rounded-md border" />
  );
}

/** Product name with thumbnail — use in tables and lists. */
export function ProductWithImage({
  name,
  imageUrl,
  subtitle,
  className,
}: {
  name: string;
  imageUrl?: string | null;
  subtitle?: string | null;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${className ?? ""}`}>
      <EntityImageThumb url={imageUrl} name={name} />
      <div className="min-w-0">
        <p className="truncate font-medium leading-snug">{name}</p>
        {subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
