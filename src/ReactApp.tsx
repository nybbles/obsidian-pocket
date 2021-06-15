import React, { useState } from "react";
import { createPortal } from "react-dom";
import { PocketItemListView } from "./PocketItemListView";

export const createReactApp = () => <ReactApp />;

type ViewProps = {
  view: PocketItemListView;
};

class View extends React.Component<ViewProps> {
  constructor(props: ViewProps) {
    super(props);
  }

  render() {
    return createPortal(this.props.view.getPortal(), this.props.view.contentEl);
  }
}

export const ReactApp = () => {
  // TODO: Need to expose setViews somehow
  const [views, setViews] = useState<PocketItemListView[]>([]);
  const portals = views.map((view) => <View view={view} />);
  return <>{...portals}</>;
};
