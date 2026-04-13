// Next.js equivalent: app/(dashboard)/workspace/[id]/_components/workspace-sidebar.tsx
// Description: Sidebar de navegación del workspace — Línea Administrativa, Técnica y Económica con submenús colapsables
// Todos los valores usan exclusivamente CSS variables del design system.
"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import {
  Users,
  BookOpen,
  DollarSign,
  ChevronDown,
  ChevronRight,
  FileSearch,
  FileText,
  AlertTriangle,
  List,
  Star,
  Trophy,
  FileOutput,
  Presentation,
  Table,
  FolderOpen,
  ShieldCheck,
  CheckSquare,
  Eye,
  Calculator,
  Settings,
  Percent,
  MessageCircle,
} from "lucide-react";

interface SidebarItem {
  id:        string;
  label:     string;
  icon?:     ReactNode;
  disabled?: boolean;
}

interface SidebarBlock {
  id: string;
  label: string;
  items: SidebarItem[];
}

interface SidebarSection {
  id: string;
  label: string;
  icon: ReactNode;
  color: string;
  blocks?: SidebarBlock[];
  items?: SidebarItem[];
}

const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    id: "admin",
    label: "Línea Administrativa",
    icon: <Users size={15} />,
    color: "var(--muted-foreground)",
    items: [
      { id: "admin-equipo", label: "Generación Kick-Off Administrativo", icon: <Users size={13} /> },
    ],
  },
  {
    id: "tecnica",
    label: "Línea Técnica",
    icon: <BookOpen size={15} />,
    color: "var(--accent)",
    blocks: [
      {
        id: "analisis",
        label: "Análisis de la licitación",
        items: [
          { id: "tec-resumen-pliego", label: "Resumen del pliego",      icon: <FileSearch size={13} /> },
          { id: "tec-incoherencias",  label: "Control de incoherencias", icon: <AlertTriangle size={13} /> },
          { id: "tec-asistente",      label: "Asistente de soporte",     icon: <MessageCircle size={13} /> },
        ],
      },
      {
        id: "propuesta",
        label: "Generación de la propuesta",
        items: [
          { id: "tec-indice",     label: "Generación índice oferta",          icon: <List size={13} /> },
          { id: "tec-referencia", label: "Recomendador de ofertas de referencia", icon: <Star size={13} /> },
          { id: "tec-win-themes", label: "Generar Win Themes",                icon: <Trophy size={13} /> },
          { id: "tec-oferta-v0",  label: "Generar Oferta v0",                 icon: <FileOutput size={13} /> },
        ],
      },
      {
        id: "documental",
        label: "Generación documental",
        items: [
          { id: "doc-ppt-nbm",  label: "Generar PPT NBM",              icon: <Presentation size={13} /> },
          { id: "doc-word",     label: "Generar Word plantilla",        icon: <FileText size={13} /> },
          { id: "doc-excel",    label: "Generar Excel seguimiento",     icon: <Table size={13} /> },
          { id: "doc-ppt-edit", label: "Generar PPT editables",         icon: <Presentation size={13} /> },
          { id: "doc-carpeta",  label: "Generar carpeta oferta",        icon: <FolderOpen size={13} /> },
        ],
      },
      {
        id: "validacion",
        label: "Validación y calidad",
        items: [
          { id: "val-evaluacion", label: "Evaluación oferta técnica", icon: <ShieldCheck size={13} /> },
          { id: "val-sobres",     label: "Control contenido sobres",  icon: <CheckSquare size={13} /> },
          { id: "val-resumen",    label: "Resumen ejecutivo",         icon: <Eye size={13} /> },
        ],
      },
    ],
  },
  {
    id: "economica",
    label: "Línea Económica",
    icon: <DollarSign size={15} />,
    color: "var(--success)",
    blocks: [
      {
        id: "analisis-eco",
        label: "Análisis económico",
        items: [
          { id: "eco-config-simulacion", label: "Configuración y simulación",  icon: <Calculator size={13} /> },
          { id: "eco-descuento-rec",     label: "Recomendación de descuento",  icon: <Percent size={13} /> },
          { id: "eco-espacio",           label: "Espacio de trabajo",           icon: <Settings size={13} /> },
        ],
      },
    ],
  },
];

interface WorkspaceSidebarProps {
  selectedItem: string;
  onSelectItem: (id: string) => void;
}

/** Returns the set of block IDs that should be expanded by default —
 *  only the block that contains the currently selected item (none hardcoded). */
function getInitialExpandedBlocks(selectedItem: string): Set<string> {
  const result = new Set<string>();
  for (const section of SIDEBAR_SECTIONS) {
    for (const block of section.blocks ?? []) {
      if (block.items.some((item) => item.id === selectedItem)) {
        result.add(block.id);
      }
    }
  }
  return result;
}

export function AppWorkspaceSidebar({ selectedItem, onSelectItem }: WorkspaceSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set([]));
  const [expandedBlocks, setExpandedBlocks]     = useState<Set<string>>(() => getInitialExpandedBlocks(selectedItem));

  const toggleSection = (id: string) => {
    // Capturamos el estado actual ANTES de actualizar para poder usarlo fuera del updater
    const isCurrentlyExpanded = expandedSections.has(id);

    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

    // Auto-navegar al abrir Línea Económica — fuera del setState para evitar
    // el warning "Cannot update a component while rendering a different component"
    if (id === "economica" && !isCurrentlyExpanded) {
      const ecoIds = new Set(
        SIDEBAR_SECTIONS.find(s => s.id === "economica")
          ?.blocks?.flatMap(b => b.items.map(i => i.id)) ?? []
      );
      if (!ecoIds.has(selectedItem)) {
        onSelectItem("eco-config-simulacion");
      }
    }
  };

  const toggleBlock = (id: string) => {
    setExpandedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <aside
      className="bg-sidebar border-r border-sidebar-border flex flex-col overflow-y-auto"
      style={{ width: "var(--sidebar-width)", flexShrink: 0, minHeight: "100%" }}
    >
      <div style={{ padding: "var(--space-2) 0", flex: 1 }}>
        {SIDEBAR_SECTIONS.map((section) => {
          const isExpanded = expandedSections.has(section.id);

          return (
            <div key={section.id}>
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between hover:bg-muted transition-colors"
                style={{
                  padding: "var(--space-2) var(--space-4)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  borderBottom: "1px solid var(--sidebar-border)",
                  fontFamily: "inherit",
                }}
              >
                <div className="flex items-center gap-2">
                  <span style={{ color: section.color }}>{section.icon}</span>
                  <span
                    style={{
                      fontSize: "var(--text-2xs)",
                      fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                      letterSpacing: "0.04em",
                      color: "var(--sidebar-foreground)",
                      fontFamily: "inherit",
                    }}
                  >
                    {section.label.toUpperCase()}
                  </span>
                </div>
                <span className="text-muted-foreground">
                  {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </span>
              </button>

              {/* Section content */}
              {isExpanded && (
                <div>
                  {/* Sections with blocks (Línea Técnica) */}
                  {section.blocks?.map((block) => {
                    const isBlockExpanded = expandedBlocks.has(block.id);
                    return (
                      <div key={block.id}>
                        {/* Block header */}
                        <button
                          onClick={() => toggleBlock(block.id)}
                          className="w-full flex items-center justify-between hover:bg-muted transition-colors"
                          style={{
                            padding: "var(--space-2) var(--space-4) var(--space-2) var(--space-6)",
                            background: "var(--neutral-subtle)",
                            border: "none",
                            cursor: "pointer",
                            borderBottom: "1px solid var(--sidebar-border)",
                            fontFamily: "inherit",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "var(--text-3xs)",
                              fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                              letterSpacing: "0.03em",
                              color: "var(--muted-foreground)",
                              fontFamily: "inherit",
                            }}
                          >
                            {block.label}
                          </span>
                          <span className="text-muted-foreground">
                            {isBlockExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                          </span>
                        </button>

                        {/* Block items */}
                        {isBlockExpanded && (
                          <div>
                            {block.items.map((item) => (
                              <SidebarItemButton
                                key={item.id}
                                item={item}
                                isSelected={selectedItem === item.id}
                                onSelect={onSelectItem}
                                indent={3}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Sections with direct items (Admin, Economic) */}
                  {section.items?.map((item) => (
                    <SidebarItemButton
                      key={item.id}
                      item={item}
                      isSelected={selectedItem === item.id}
                      onSelect={onSelectItem}
                      indent={2}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

interface SidebarItemButtonProps {
  item:       SidebarItem;
  isSelected: boolean;
  onSelect:   (id: string) => void;
  indent:     number;
}

function SidebarItemButton({ item, isSelected, onSelect, indent }: SidebarItemButtonProps) {
  const isDisabled = item.disabled === true;
  return (
    <button
      onClick={() => !isDisabled && onSelect(item.id)}
      className="w-full flex items-center gap-2 text-left transition-colors"
      style={{
        padding: `var(--space-2) var(--space-4) var(--space-2) ${indent * 8 + 8}px`,
        background: isSelected ? "var(--sidebar-primary)" : "none",
        border: "none",
        cursor: isDisabled ? "default" : "pointer",
        borderBottom: "1px solid var(--sidebar-border)",
        color: isDisabled
          ? "var(--muted-foreground)"
          : isSelected
            ? "var(--sidebar-primary-foreground)"
            : "var(--sidebar-foreground)",
        opacity: isDisabled ? 0.55 : 1,
        fontFamily: "inherit",
      }}
    >
      {item.icon && (
        <span style={{ opacity: isSelected ? 1 : 0.6, flexShrink: 0 }}>{item.icon}</span>
      )}
      <span
        style={{
          fontSize: "var(--text-xs)",
          lineHeight: "1.35",
          fontWeight: isSelected
            ? ("var(--font-weight-semibold)" as CSSProperties["fontWeight"])
            : ("var(--font-weight-normal)" as CSSProperties["fontWeight"]),
          fontFamily: "inherit",
          flex: 1,
        }}
      >
        {item.label}
      </span>
      {isDisabled && (
        <span
          style={{
            fontSize: "var(--text-3xs)",
            padding: "1px 6px",
            borderRadius: "var(--radius-chip)",
            background: "var(--neutral-subtle)",
            color: "var(--muted-foreground)",
            fontFamily: "inherit",
            letterSpacing: "0.03em",
            flexShrink: 0,
          }}
        >
          Próxim.
        </span>
      )}
    </button>
  );
}