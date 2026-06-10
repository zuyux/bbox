import * as React from "react";

import { cn } from "@/lib/utils";

export function H1({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        "scroll-m-20 text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl",
        className,
      )}
      {...props}
    />
  );
}

export function H2({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "scroll-m-20 text-3xl font-semibold tracking-tight text-foreground md:text-4xl",
        className,
      )}
      {...props}
    />
  );
}

export function H3({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "scroll-m-20 text-2xl font-semibold tracking-tight text-foreground md:text-3xl",
        className,
      )}
      {...props}
    />
  );
}

export function Paragraph({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "leading-7 text-base text-foreground [&:not(:first-child)]:mt-6",
        className,
      )}
      {...props}
    />
  );
}

export function Lead({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-xl leading-8 text-muted-foreground max-w-3xl [&:not(:first-child)]:mt-6",
        className,
      )}
      {...props}
    />
  );
}

export function Small({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <small className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
}
