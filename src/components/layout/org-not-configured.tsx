import { AlertCircle } from "lucide-react";

export function OrgNotConfigured() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
      <h2 className="text-lg font-semibold mb-2">Organization not configured</h2>
      <p className="text-muted-foreground max-w-md">
        Your Clerk organization is not linked to a client account. Please
        contact your administrator to set up your organization.
      </p>
    </div>
  );
}
