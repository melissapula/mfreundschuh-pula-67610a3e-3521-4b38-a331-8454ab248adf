export interface Organization {
  id: string;
  name: string;
  /** null = root org. Non-null = sub-org of a root; the hierarchy is capped at 2 levels. */
  parentOrgId: string | null;
}
