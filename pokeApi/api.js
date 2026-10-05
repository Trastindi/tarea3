let getAllPokemons = async () => {
    let pokemonData = await fetch("https://pokeapi.co/api/v2/pokemon");

    pokemonData = await pokemonData.json();

    return pokemonData;
}

let getPokemonById = async (id) => {
    /* return pokemon */

    let pokemonData = await fetch("https://pokeapi.co/api/v2/pokemon/" + id);

    if (!pokemonData.ok) {
        return null; // Return null if the response is not ok (e.g., 404 Not Found)
    }

    pokemonData = await pokemonData.json();

    return pokemonData;
}

let getPokemonSpeciesById = async (id) => {
    /* return pokemon */

    let pokemonData = await fetch("https://pokeapi.co/api/v2/pokemon-species/" + id);

    pokemonData = await pokemonData.json();

    return pokemonData;
}

let getPokemonsAbility = async (abilityName) => {
    let pokemonData = await fetch("https://pokeapi.co/api/v2/ability/" + abilityName);

    pokemonData = await pokemonData.json();

    return pokemonData;
};

let getPokemonType = async (typeName) => {
    let pokemonData = await fetch("https://pokeapi.co/api/v2/type/" + typeName);

    pokemonData = await pokemonData.json();

    return pokemonData;
};

let getTypeTable = async (pokemonTypes) => {
    let debilidades = []
    let fortalezas = []
    let nulos = []

    for (const pokemonType of pokemonTypes) {
        const type = await getPokemonType(pokemonType.type.name);

        type.damage_relations.double_damage_from.forEach(t => {
            debilidades.push(t.name);
        });
        type.damage_relations.half_damage_from.forEach(t => {
            fortalezas.push(t.name);
        });
        type.damage_relations.no_damage_from.forEach(t => {
            nulos.push(t.name);
        });
    }

    return [debilidades, fortalezas, nulos]
};

let filterWeakness = (pokemonWeakness, pokemonResistances, pokemonNullTypes) => {
    return [...new Set(
        pokemonWeakness.filter(debilidad =>
            !pokemonResistances.includes(debilidad) &&
            !pokemonNullTypes.includes(debilidad)
        )
    )];
};

export { getAllPokemons, getPokemonById, getPokemonSpeciesById, getPokemonsAbility, getPokemonType, getTypeTable, filterWeakness}