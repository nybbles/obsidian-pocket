import update from "immutability-helper";
import { useEffect, useState } from "react";
import { PocketItemListView } from "./PocketItemListView";

export type ViewName = string;
export type ViewMapping = Map<ViewName, PocketItemListView>;
export type SetViewMapping = (viewMapping: ViewMapping) => void;

export class ViewManager {
  views: ViewMapping;
  setState: SetViewMapping;

  constructor() {
    this.views = new Map();
  }

  useState(): [ViewMapping, SetViewMapping] {
    const [state, setState] = useState(this.views);

    // Make sure setState reference is stored in this instance
    useEffect(() => {
      this.setState = setState;
    }, [this]);

    return [state, setState];
  }

  addView(viewName: ViewName, view: PocketItemListView): void {
    console.log(`Adding view for ${viewName}`);
    this.views = update(this.views, { $add: [[viewName, view]] });
    this.setState(this.views);
    console.log(`views: ${Array.from(this.views.keys())}`);
  }
  removeView(viewName: ViewName): void {
    console.log(`Removing view for ${viewName}`);
    this.views = update(this.views, { $remove: [viewName] });
    this.setState(this.views);
    console.log(`views: ${Array.from(this.views.keys())}`);
  }
  clearViews(): void {
    this.views = update(this.views, { $set: new Map() });
    this.setState(this.views);
  }
}
