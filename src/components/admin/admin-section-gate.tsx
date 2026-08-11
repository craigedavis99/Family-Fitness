import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";

type AdminSectionGateProps = {
  isAdmin: boolean;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function AdminSectionGate({
  isAdmin,
  title,
  description,
  children,
}: AdminSectionGateProps) {
  return (
    <div className="space-y-6">
      <AdminPageHeader title={title} description={description} />
      {isAdmin ? (
        children
      ) : (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">
            Admin sign in is required for this section.{" "}
            <Link href="/admin" className="font-medium text-primary underline-offset-4 hover:underline">
              Go to Admin
            </Link>{" "}
            to sign in or claim admin access.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
