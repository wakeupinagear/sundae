import clsx from 'clsx';
import { useDeferredValue, useMemo, useState } from 'react';

import { ENGINE_SCENARIOS, type ScenarioList } from '@repo/engine-scenarios';

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

    return (
        <div className="w-40 flex flex-col gap-2">
            <h1 className="p-2">🍨 Sundae</h1>
            <input
                className="p-2"
                type="text"
                placeholder="Search"
                onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex flex-col p-2 gap-4">
                {Object.entries(filteredScenarios).map(
                    ([categoryID, category]) => (
                        <div key={categoryID} className="flex flex-col gap-2">
                            <h2 className="text-lg">{category.name}</h2>
                            <div className="flex flex-col gap-2 pl-2">
                                {Object.entries(category.scenarios).map(
                                    ([scenarioID, scenario]) =>
                                        !scenario.hideInDemos ? (
                                            <a
                                                key={scenarioID}
                                                id={scenarioToID(
                                                    categoryID,
                                                    scenarioID,
                                                )}
                                                href={`#${scenarioToID(categoryID, scenarioID)}`}
                                                className={clsx(
                                                    'font-medium hover:underline',
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
                                        ) : null,
                                )}
                            </div>
                        </div>
                    ),
                )}
            </div>
        </div>
    );
}
