export function TableTabs({
  tableTab,
  tabPrefix,
  onChange,
}: {
  tableTab: "points" | "projects";
  tabPrefix: string;
  onChange: (tab: "points" | "projects") => void;
}) {
  return (
    <div className="table-tabs" role="tablist" aria-label="表格内容">
      {(["points", "projects"] as const).map((tab, index) => (
        <button
          key={tab}
          role="tab"
          id={`${tabPrefix}-${tab}-tab`}
          aria-controls={`${tabPrefix}-${tab}-panel`}
          aria-selected={tableTab === tab}
          tabIndex={tableTab === tab ? 0 : -1}
          onClick={() => onChange(tab)}
          onKeyDown={(event) => {
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? 1
                  : event.key === "ArrowRight" || event.key === "ArrowLeft"
                    ? 1 - index
                    : -1;
            if (next < 0) return;
            event.preventDefault();
            (
              event.currentTarget.parentElement?.children[next] as
                HTMLButtonElement | undefined
            )?.click();
            (
              event.currentTarget.parentElement?.children[next] as
                HTMLButtonElement | undefined
            )?.focus();
          }}
        >
          {tab === "points" ? "位置点" : "项目"}
        </button>
      ))}
    </div>
  );
}
