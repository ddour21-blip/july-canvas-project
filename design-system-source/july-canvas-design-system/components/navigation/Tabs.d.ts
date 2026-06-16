import * as React from 'react';

export interface TabItem {
  key: string;
  label: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  /** Active tab key (controlled). */
  value: string;
  /** Called with the selected tab key. */
  onChange?: (key: string) => void;
  className?: string;
}

/**
 * Underline tab bar — used for the project Overview / Documents / Prototype
 * sections and the policy panel's Edit / History switch.
 */
export function Tabs(props: TabsProps): React.JSX.Element;
export default Tabs;
