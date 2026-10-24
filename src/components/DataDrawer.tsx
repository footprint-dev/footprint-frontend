import type { ReactNode, RefObject } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronDown, ChevronUp, Maximize2, Table2, X } from "lucide-react";
import { IconButton } from "./ui";
import { TableTabs } from "./TableTabs";
import { count } from "../lib/model";

interface Props {
  open: boolean;
  dialogOpen: boolean;
  tableTab: "points" | "projects";
  tabPrefix: string;
  total: number;
  drawerRef: RefObject<HTMLDivElement | null>;
  searchRef: RefObject<HTMLInputElement | null>;
  onTabChange: (tab: "points" | "projects") => void;
  onToggle: () => void;
  onDialogOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function DataDrawer({
  open,
  dialogOpen,
  tableTab,
  tabPrefix,
  total,
  drawerRef,
  searchRef,
  onTabChange,
  onToggle,
  onDialogOpenChange,
  children,
}: Props) {
  const tabs = (
    <TableTabs
      tableTab={tableTab}
      tabPrefix={tabPrefix}
      onChange={onTabChange}
    />
  );
  const unit = tableTab === "points" ? "条记录" : "个项目";
  return (
    <Dialog.Root open={dialogOpen} onOpenChange={onDialogOpenChange}>
      <section className="data-drawer" ref={drawerRef} aria-label="轨迹数据表">
        <div className="drawer-header">
          <div className="drawer-identity">
            <span className="section-index">02</span>
            <Table2 size={17} />
            <h2>足迹数据</h2>
            {!dialogOpen && tabs}
            <span className="drawer-count">
              {count(total)} <span>{unit}</span>
            </span>
          </div>
          <div className="drawer-actions">
            <Dialog.Trigger asChild>
              <IconButton label="弹窗查看表格">
                <Maximize2 size={17} />
              </IconButton>
            </Dialog.Trigger>
            <IconButton
              label={open ? "收起表格" : "打开表格"}
              aria-expanded={open}
              onClick={onToggle}
            >
              {open ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </IconButton>
          </div>
        </div>
        {open && !dialogOpen && children}
      </section>
      <Dialog.Portal>
        <Dialog.Overlay className="table-dialog-overlay" />
        <Dialog.Content
          className="table-dialog"
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            searchRef.current?.focus();
          }}
        >
          <div className="drawer-header">
            <div className="drawer-identity">
              <Table2 size={17} />
              <Dialog.Title>足迹数据</Dialog.Title>
              {tabs}
              <span className="table-dialog-count">
                {count(total)} {unit}
              </span>
            </div>
            <Dialog.Close asChild>
              <IconButton label="关闭表格弹窗">
                <X size={18} />
              </IconButton>
            </Dialog.Close>
          </div>
          {dialogOpen && children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
