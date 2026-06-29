/**
 * Predefined pipeline templates. Each template seeds a pipeline with
 * a friendly name + description; the workflow steps are filled in by
 * the user via the normal Upload/Validate/Clean/Transform UI.
 */
import { BarChart3, Briefcase, DollarSign, Megaphone, Package, ShoppingCart, Users } from "lucide-react";

export interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  icon: typeof BarChart3;
  category: string;
}

export const PIPELINE_TEMPLATES: PipelineTemplate[] = [
  {
    id: "customer-orders",
    name: "Customer Orders",
    description: "Clean and analyze e-commerce orders with revenue + product breakdowns.",
    icon: ShoppingCart,
    category: "Retail",
  },
  {
    id: "sales",
    name: "Sales Performance",
    description: "Normalize sales records, fill missing regions, group by quarter.",
    icon: BarChart3,
    category: "Sales",
  },
  {
    id: "hr",
    name: "HR Headcount",
    description: "Dedupe employee records, validate emails, summarize by department.",
    icon: Users,
    category: "People",
  },
  {
    id: "finance",
    name: "Finance Transactions",
    description: "Validate amounts, dedupe, classify revenue vs. expense.",
    icon: DollarSign,
    category: "Finance",
  },
  {
    id: "inventory",
    name: "Inventory Snapshot",
    description: "Reconcile stock counts, flag negative quantities, by-warehouse aggregates.",
    icon: Package,
    category: "Operations",
  },
  {
    id: "marketing",
    name: "Marketing Campaigns",
    description: "Clean campaign exports, dedupe leads, group by source and channel.",
    icon: Megaphone,
    category: "Marketing",
  },
  {
    id: "blank",
    name: "Blank pipeline",
    description: "Start from scratch — upload your own dataset and define each step.",
    icon: Briefcase,
    category: "Custom",
  },
];
