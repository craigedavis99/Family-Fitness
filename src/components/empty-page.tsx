import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type EmptyPageProps = {
  title: string;
  description: string;
};

export function EmptyPage({ title, description }: EmptyPageProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Coming in a future build phase. The navigation shell is ready.
        </p>
      </CardContent>
    </Card>
  );
}
