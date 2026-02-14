'use client';

import { Check, ChevronsUpDown } from 'lucide-react';
import * as React from 'react';

import { Button } from '@repo/ui/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from '@repo/ui/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@repo/ui/components/ui/popover';
import { cn } from '@repo/ui/lib/utils';

type SelectItem<T> = { value: T; label: string };

type Group = { label: string };

interface MultiSelectProps<T> {
    items: T[];
    onChange: (items: T[], changedItem: T, mode: 'added' | 'removed') => void;
    content: (SelectItem<T> | Group)[];
    searchEnabled?: boolean;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

function MultiSelect<T extends string | number>({
    items,
    onChange,
    content,
    searchEnabled,
    placeholder = 'Select items',
    className,
    disabled,
}: MultiSelectProps<T>) {
    const [open, setOpen] = React.useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild disabled={disabled}>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn('justify-between', className)}
                    disabled={disabled}
                >
                    <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left">
                        {items.length > 0
                            ? content
                                  .filter(
                                      (o) =>
                                          'value' in o &&
                                          items.includes(o.value),
                                  )
                                  .map((o) => o.label)
                                  .join(', ')
                            : placeholder}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-1">
                <Command>
                    {searchEnabled && <CommandInput placeholder="Search..." />}
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup>
                        {content.map((option) => {
                            if ('value' in option) {
                                const isSelected = items.includes(option.value);

                                return (
                                    <CommandItem
                                        key={option.value.toString()}
                                        onSelect={() => {
                                            if (isSelected) {
                                                onChange(
                                                    items.filter(
                                                        (item) =>
                                                            item !==
                                                            option.value,
                                                    ),
                                                    option.value,
                                                    'removed',
                                                );
                                            } else {
                                                onChange(
                                                    [...items, option.value],
                                                    option.value,
                                                    'added',
                                                );
                                            }
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                'mr-2 h-4 w-4',
                                                isSelected
                                                    ? 'opacity-100'
                                                    : 'opacity-0',
                                            )}
                                        />
                                        {option.label}
                                    </CommandItem>
                                );
                            }
                            return (
                                <CommandGroup key={option.label}>
                                    {option.label}
                                </CommandGroup>
                            );
                        })}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

export { MultiSelect };
