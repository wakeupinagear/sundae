import * as React from "react"

import { cn } from "@repo/ui/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "ui-:flex ui-:h-10 ui-:w-full ui-:rounded-md ui-:border ui-:border-slate-200 ui-:bg-white ui-:px-3 ui-:py-2 ui-:text-base ui-:ring-offset-white ui-:file:border-0 ui-:file:bg-transparent ui-:file:text-sm ui-:file:font-medium ui-:file:text-slate-950 ui-:placeholder:text-slate-500 ui-:focus-visible:outline-none ui-:focus-visible:ring-2 ui-:focus-visible:ring-slate-950 ui-:focus-visible:ring-offset-2 ui-:disabled:cursor-not-allowed ui-:disabled:opacity-50 ui-:md:text-sm ui-:dark:border-slate-800 ui-:dark:bg-slate-950 ui-:dark:ring-offset-slate-950 ui-:dark:file:text-slate-50 ui-:dark:placeholder:text-slate-400 ui-:dark:focus-visible:ring-slate-300",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
