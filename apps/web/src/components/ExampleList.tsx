import clsx from 'clsx';
import { Search } from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

import { ENGINE_SCENARIOS, type ScenarioList } from '@repo/engine-scenarios';
import { Input } from '@repo/ui/components/ui/input';

import { scenarioToID } from '../utils/scenarios';

interface ExampleListProps {
    selectedCategoryID: string;
    selectedScenarioID: string;
}

export function ExampleList({
    selectedCategoryID,
    selectedScenarioID,
}: ExampleListProps) {
    const [search, setSearch] = useState('');
    const deferredSearch = useDeferredValue(search);

    const filteredScenarios = useMemo<ScenarioList>(() => {
        const searchLower = deferredSearch.trim().toLowerCase();
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
    }, [deferredSearch]);

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
        <div className="w-full min-w-0 flex flex-col gap-2 p-2">
            <div className="relative">
                <Search
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    size={12}
                />
                <Input
                    ref={inputRef}
                    className="pl-6 pr-2 text-sm"
                    type="text"
                    name="Search"
                    placeholder="Search Examples"
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <div className="flex flex-col p-2 gap-4">
                {Object.entries(filteredScenarios).map(
                    ([categoryID, category]) =>
                        category.hideInDemos ? null : (
                            <div
                                key={categoryID}
                                className="flex flex-col gap-2"
                            >
                                <h2 className="text-foreground">
                                    {category.name}
                                </h2>
                                <div className="flex flex-col gap-2 pl-2">
                                    {Object.entries(category.scenarios).map(
                                        ([scenarioID, scenario]) => (
                                            <a
                                                key={scenarioID}
                                                id={scenarioToID(
                                                    categoryID,
                                                    scenarioID,
                                                )}
                                                href={`#${scenarioToID(categoryID, scenarioID)}`}
                                                className={clsx(
                                                    'font-medium text-primary hover:underline',
                                                    {
                                                        underline:
                                                            categoryID ===
                                                                selectedCategoryID &&
                                                            scenarioID ===
                                                                selectedScenarioID,
                                                    },
                                                )}
                                            >
                                                {scenario.name}
                                            </a>
                                        ),
                                    )}
                                </div>
                            </div>
                        ),
                )}
            </div>
        </div>
    );
}
