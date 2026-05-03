import { Link } from "wouter";
import { Calendar } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <div className="text-center">
        <Calendar className="w-12 h-12 text-primary/40 mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
        <p className="text-muted-foreground mb-6">Page not found</p>
        <Link href="/" className="text-primary text-sm hover:underline font-medium">
          Go to Calendar
        </Link>
      </div>
    </div>
  );
}
