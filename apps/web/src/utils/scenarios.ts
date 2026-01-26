export const scenarioToID = (
    categoryID: string,
    scenarioID: string,
): string => {
    return `${categoryID}-${scenarioID}`;
};

export const idToScenario = (id: string): [string, string] => {
    const [categoryID = '', scenarioID = ''] = id.split('-');

    return [categoryID.trim(), scenarioID.trim()];
};
