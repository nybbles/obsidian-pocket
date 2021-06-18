import React from "react";
import { createPortal } from "react-dom";
import { PocketItemListView } from "./PocketItemListView";
import { ViewManager } from "./ViewManager";

export const createReactApp = (viewManager: ViewManager) => (
  <ReactApp viewManager={viewManager} />
);

export type ViewProps = {
  view: PocketItemListView;
};

export class View extends React.Component<ViewProps> {
  constructor(props: ViewProps) {
    super(props);
  }

  render() {
    return createPortal(this.props.view.getPortal(), this.props.view.contentEl);
  }
}

export type ReactAppProps = {
  viewManager: ViewManager;
};

export const ReactApp = ({ viewManager }: ReactAppProps) => {
  const [views, _setViews] = viewManager.useState();
  const portals = [];
  for (const view of Array.from(views.values())) {
    portals.push(<View key={view.id} view={view} />);
  }

  return <>{...portals}</>;
};
