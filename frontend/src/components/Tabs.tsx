"use client";

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";

interface TabsContextValue {
  value: string;
  setValue: (id: string) => void;
  baseId: string;
  orientation: "horizontal" | "vertical";
  registerTab: (id: string, el: HTMLButtonElement | null) => void;
  listTabIds: () => string[];
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error("Tabs.* deve ser usado dentro de <Tabs>.");
  }
  return ctx;
}

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function Tabs({
  value,
  onValueChange,
  children,
  orientation = "horizontal",
  className,
}: TabsProps) {
  const baseId = useId();
  const tabEls = useRef(new Map<string, HTMLButtonElement>());
  const tabOrder = useRef<string[]>([]);

  const registerTab = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) {
      tabEls.current.set(id, el);
      if (!tabOrder.current.includes(id)) {
        tabOrder.current = [...tabOrder.current, id];
      }
      return;
    }
    tabEls.current.delete(id);
    tabOrder.current = tabOrder.current.filter((item) => item !== id);
  }, []);

  const listTabIds = useCallback(() => tabOrder.current.slice(), []);

  const setValue = useCallback(
    (id: string) => {
      onValueChange(id);
      tabEls.current.get(id)?.focus();
    },
    [onValueChange],
  );

  const ctx = useMemo(
    () => ({
      value,
      setValue,
      baseId,
      orientation,
      registerTab,
      listTabIds,
    }),
    [value, setValue, baseId, orientation, registerTab, listTabIds],
  );

  return (
    <TabsContext.Provider value={ctx}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabListProps {
  "aria-label": string;
  children: ReactNode;
  className?: string;
}

export function TabList({
  "aria-label": ariaLabel,
  children,
  className,
}: TabListProps) {
  const { orientation, listTabIds, value, setValue } = useTabsContext();

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const tabIds = listTabIds();
    if (tabIds.length === 0) {
      return;
    }
    const atual = tabIds.indexOf(value);
    const vertical = orientation === "vertical";
    const nextKeys = vertical
      ? ["ArrowDown", "ArrowRight"]
      : ["ArrowRight", "ArrowDown"];
    const prevKeys = vertical
      ? ["ArrowUp", "ArrowLeft"]
      : ["ArrowLeft", "ArrowUp"];

    let proximo = atual;
    if (nextKeys.includes(event.key)) {
      event.preventDefault();
      proximo = (atual + 1) % tabIds.length;
    } else if (prevKeys.includes(event.key)) {
      event.preventDefault();
      proximo = (atual - 1 + tabIds.length) % tabIds.length;
    } else if (event.key === "Home") {
      event.preventDefault();
      proximo = 0;
    } else if (event.key === "End") {
      event.preventDefault();
      proximo = tabIds.length - 1;
    } else {
      return;
    }
    setValue(tabIds[proximo]);
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation={orientation}
      className={className}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  );
}

interface TabProps {
  id: string;
  children: ReactNode;
  className?: string | ((ativo: boolean) => string);
}

export function Tab({ id, children, className }: TabProps) {
  const { value, setValue, baseId, registerTab } = useTabsContext();
  const ativo = value === id;
  const classes =
    typeof className === "function" ? className(ativo) : className;

  const setRef = useCallback(
    (el: HTMLButtonElement | null) => {
      registerTab(id, el);
    },
    [id, registerTab],
  );

  return (
    <button
      ref={setRef}
      type="button"
      role="tab"
      id={`${baseId}-tab-${id}`}
      aria-controls={`${baseId}-panel-${id}`}
      aria-selected={ativo}
      tabIndex={ativo ? 0 : -1}
      className={classes}
      onClick={() => setValue(id)}
    >
      {children}
    </button>
  );
}

interface TabPanelProps {
  id: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ id, children, className }: TabPanelProps) {
  const { value, baseId } = useTabsContext();
  if (value !== id) {
    return null;
  }
  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${id}`}
      aria-labelledby={`${baseId}-tab-${id}`}
      className={className}
      tabIndex={0}
    >
      {children}
    </div>
  );
}
