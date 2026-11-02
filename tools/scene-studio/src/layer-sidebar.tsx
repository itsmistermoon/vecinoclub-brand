import { useRef, useState, type ReactNode, type DragEvent } from "react";
import {
  Plus,
  GripVertical,
  Layers,
  TreePine,
  Store,
  Armchair,
  Droplet,
  MapPin,
  EyeOff,
} from "lucide-react";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
} from "@/components/base-ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  names,
  mapNames,
  shopNames,
  type ShopVariant,
  type Element,
  type Kind,
  type MapVariant,
} from "./model";
import { cn } from "@/lib/utils";
const icons = {
  map: Layers,
  shop: Store,
  tree: TreePine,
  bench: Armchair,
  punto: MapPin,
  isotipo: MapPin,
  gota: Droplet,
};
type Edge = "above" | "below";
export function LayerSidebar({
  elements,
  selected,
  onSelect,
  onAdd,
  onDrop,
  renderMenu,
}: {
  elements: Element[];
  selected: string;
  onSelect: (id: string) => void;
  onAdd: (kind: Kind, variant?: MapVariant, shopVariant?: ShopVariant) => void;
  onDrop: (id: string, target: string, edge: Edge) => void;
  renderMenu: (element: Element) => ReactNode;
}) {
  const dragged = useRef<string | null>(null),
    [drop, setDrop] = useState<{ id: string; edge: Edge } | null>(null);
  const edgeAt = (event: DragEvent<HTMLElement>): Edge =>
    event.clientY <
    event.currentTarget.getBoundingClientRect().top +
      event.currentTarget.getBoundingClientRect().height / 2
      ? "above"
      : "below";
  return (
    <Sidebar
      collapsible="none"
      className="layer-panel w-full"
      role="complementary"
      aria-label="Elementos y orden de apilado"
    >
      <SidebarHeader>
        <div className="panel-heading">
          <h2>
            Elementos{" "}
            <span className="text-muted-foreground">{elements.length}</span>
          </h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Añadir elemento">
                <Plus />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Elementos</DropdownMenuLabel>
                {(Object.keys(names) as Kind[])
                  .filter((kind) => kind !== "map" && kind !== "shop")
                  .map((kind) => {
                    const Icon = icons[kind];
                    return (
                      <DropdownMenuItem key={kind} onSelect={() => onAdd(kind)}>
                        <Icon />
                        {names[kind]}
                      </DropdownMenuItem>
                    );
                  })}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Comercios con toldo</DropdownMenuLabel>
                {(Object.keys(shopNames) as ShopVariant[]).map((variant) => (
                  <DropdownMenuItem
                    key={variant}
                    onSelect={() => onAdd("shop", "barrio", variant)}
                  >
                    <Store />
                    {shopNames[variant]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Mapas</DropdownMenuLabel>
                {(Object.keys(mapNames) as MapVariant[]).map((variant) => (
                  <DropdownMenuItem
                    key={variant}
                    onSelect={() => onAdd("map", variant)}
                  >
                    <Layers />
                    Mapa · {mapNames[variant]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="py-0">
          <SidebarGroupLabel>Orden: de delante a fondo</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {[...elements].reverse().map((e, index) => {
                const Icon = icons[e.kind];
                return (
                  <SidebarMenuItem
                    key={e.id}
                    data-layer-row={e.id}
                    aria-posinset={index + 1}
                    aria-setsize={elements.length}
                    className={cn(
                      drop?.id === e.id &&
                        (drop.edge === "above"
                          ? "layer-drop-above"
                          : "layer-drop-below"),
                    )}
                    onDragOver={(event) => {
                      if (!dragged.current || dragged.current === e.id) return;
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setDrop({ id: e.id, edge: edgeAt(event) });
                    }}
                    onDragLeave={(event) => {
                      if (
                        !event.currentTarget.contains(
                          event.relatedTarget as Node,
                        )
                      )
                        setDrop(null);
                    }}
                    onDrop={(event) => {
                      if (!dragged.current) return;
                      event.preventDefault();
                      const id = dragged.current;
                      onDrop(id, e.id, edgeAt(event));
                      dragged.current = null;
                      setDrop(null);
                    }}
                  >
                    <SidebarMenuButton
                      data-layer={e.id}
                      isActive={selected === e.id}
                      aria-pressed={selected === e.id}
                      onClick={() => onSelect(e.id)}
                      title={e.name}
                      className="pr-16 group-has-data-[sidebar=menu-action]/menu-item:pr-16"
                    >
                      <Icon />
                      <span>{e.name}</span>
                      {!e.visible && <EyeOff />}
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      className="right-8 hidden cursor-grab active:cursor-grabbing md:flex"
                      aria-label={`Arrastrar ${e.name} para cambiar orden`}
                      title="Arrastrar para cambiar orden"
                      draggable={elements.length > 1}
                      onDragStart={(event) => {
                        dragged.current = e.id;
                        onSelect(e.id);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData(
                          "application/x-vecinoclub-layer",
                          e.id,
                        );
                        event.dataTransfer.setDragImage(
                          event.currentTarget.closest("[data-layer-row]")!,
                          16,
                          16,
                        );
                      }}
                      onDragEnd={() => {
                        dragged.current = null;
                        setDrop(null);
                      }}
                    >
                      <GripVertical />
                    </SidebarMenuAction>
                    {renderMenu(e)}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="layer-help">
        <p>Arrastra el asa para cambiar el orden.</p>
        <p>
          <kbd>Alt</kbd> + rueda para escalar en el lienzo.
        </p>
        <p>Menú ··· para ordenar, duplicar o eliminar.</p>
      </SidebarFooter>
    </Sidebar>
  );
}
