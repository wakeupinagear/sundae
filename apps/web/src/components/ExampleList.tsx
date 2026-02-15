import clsx from 'clsx';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';

import { ENGINE_SCENARIOS, type ScenarioList } from '@repo/engine-scenarios';
import { Input } from '@repo/ui/components/ui/input';

import { scenarioToID } from '../utils/scenarios';

const VITE_BASE_URL = import.meta.env.BASE_URL || '/';
const NORMALIZED_BASE_URL = VITE_BASE_URL.replace(/\/+$/, '');

interface ExampleSearchBarProps {
    value: string;
    onChange: (value: string) => void;
}

export function ExampleSearchBar({ value, onChange }: ExampleSearchBarProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === '/') {
                event.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    return (
        <div className="relative shrink-0">
            <Search
                className="absolute top-3 left-2 text-muted-foreground"
                size={12}
            />
            <Input
                ref={inputRef}
                className="pl-6 pr-2 text-sm"
                type="text"
                name="Search"
                placeholder="Search Examples"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
}

interface ExampleListProps {
    search: string;
    selectedCategoryID: string;
    selectedScenarioID: string;
}

export function ExampleList({
    search,
    selectedCategoryID,
    selectedScenarioID,
}: ExampleListProps) {
    const filteredScenarios = useMemo<ScenarioList>(() => {
        const searchLower = search.trim().toLowerCase();
        if (!searchLower) return ENGINE_SCENARIOS;

        return Object.entries(ENGINE_SCENARIOS).reduce(
            (acc, [categoryID, category]) => {
                if (category.name.toLowerCase().includes(searchLower)) {
                    return { ...acc, [categoryID]: category };
                }

                const matching = Object.entries(category.scenarios).filter(
                    ([, scenario]) =>
                        scenario.name.toLowerCase().includes(searchLower),
                );
                if (matching.length === 0) return acc;

                return {
                    ...acc,
                    [categoryID]: {
                        ...category,
                        scenarios: Object.fromEntries(matching),
                    },
                };
            },
            {},
        );
    }, [search]);

    return (
        <div className="w-full min-w-0 flex flex-col gap-2">
            <div className="flex flex-col gap-4">
                {Object.entries(filteredScenarios).map(
                    ([categoryID, category]) =>
                        category.hideInDemos ? null : (
                            <div key={categoryID} className="flex flex-col">
                                <h2 className="text-foreground sticky top-0 bg-background pb-1">
                                    {category.name}
                                </h2>
                                <div className="flex flex-col gap-6">
                                    {Object.entries(category.scenarios).map(
                                        ([scenarioID, scenario]) => {
                                            const selected =
                                                categoryID ===
                                                    selectedCategoryID &&
                                                scenarioID ===
                                                    selectedScenarioID;
                                            return (
                                                <a
                                                    key={scenarioID}
                                                    id={scenarioToID(
                                                        categoryID,
                                                        scenarioID,
                                                    )}
                                                    href={`#${scenarioToID(categoryID, scenarioID)}`}
                                                    className={clsx(
                                                        'scroll-mt-8 font-medium text-primary hover:underline flex flex-col gap-1 text-sm',
                                                        {
                                                            underline: selected,
                                                        },
                                                    )}
                                                >
                                                    <img
                                                        src={`${NORMALIZED_BASE_URL}/snapshots/${scenarioID}/000.png`}
                                                        className={clsx(
                                                            'rounded-md',
                                                            {
                                                                'border-ring border-solid border-2':
                                                                    selected,
                                                            },
                                                        )}
                                                    />
                                                    {scenario.name}
                                                </a>
                                            );
                                        },
                                    )}
                                </div>
                            </div>
                        ),
                )}
            </div>
        </div>
    );
}
