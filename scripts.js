import * as pokeApi from "./pokeApi/api.js"
import * as bootstrap from "./node_modules/bootstrap/dist/js/bootstrap.min.js";


window.addEventListener("load", function () {

    /*QuerySelectorAll devuelve TODOS los elementos que cumplan el selector*/
    let pokemonId = 1;
    let pokemonName = document.querySelectorAll("#pokemonName");
    let pokemonSprite = document.querySelectorAll("#pokemonSprite");
    let pokemonDescription = document.querySelectorAll("#pokemonDescription");
    let pokemonHeight = document.getElementById("altura");
    let pokemonWeight = document.getElementById("peso");
    let pokemonSex = document.getElementById("sexo");
    let pokemonGenus = document.getElementById("categoria");
    let pokemonAbility = document.getElementById("habilidad");
    let pokemonTypes = document.getElementById("tipo");
    let pokemonWeakness = document.getElementById("debilidad");

    /*Retorna SOLO el primer elemento que cumpla con tener el id ya que un id debe ser UNICO en el DOM*/
    let form1 = document.getElementById("form1");
    const pokemonIdInput = document.getElementById("pokemonId");

    let versions = document.querySelectorAll("#version")
    let actualVersion = 0;
    let pokemonSpeciesData;

    let siguiente = document.getElementById("next")
    let atras = document.getElementById("back")

    const pokemonStats = document.getElementById("pokemonStats");

    const nombresStats = {
        hp: "PS",
        attack: "Ataque",
        defense: "Defensa",
        "special-attack": "Ataque especial",
        "special-defense": "Defensa especial",
        speed: "Velocidad"
    };

    versions.forEach(version => {
        version.addEventListener('change', (e) => {
            actualVersion = version.value;
            pokemonDescription[0].textContent = pokemonSpeciesData.flavor_text_entries[actualVersion].flavor_text;
        });
    });

    form1.addEventListener("submit", async function ($e) {
        $e.preventDefault();
        let formData = new FormData(this);
        let pokemonNumber = formData.get("pokemonId");
        await actualizarPokemon(pokemonNumber);
    });


    siguiente.addEventListener("click", async function (e) {
        e.preventDefault();
        const pokemonNumber = pokemonId >= 1025 ? 1 : pokemonId + 1;

        pokemonIdInput.value = pokemonNumber;

        await actualizarPokemon(pokemonNumber);
    });

    atras.addEventListener("click", async function (e) {
        e.preventDefault();
        
        const pokemonNumber = pokemonId <= 1 ? 1025 : pokemonId - 1;

        pokemonIdInput.value = pokemonNumber;

        await actualizarPokemon(pokemonNumber);
    });

    async function actualizarPokemon(pokemonNumber) {
        let pokemonData = await pokeApi.getPokemonById(pokemonNumber);
        pokemonId = pokemonData?.id || pokemonId; // Actualiza el ID solo si se encontró un Pokémon válido
        
        if (pokemonData === null) {
            alert("No se encontró el Pokémon con el ID o nombre proporcionado.");
            return;
        }

        pokemonName[0].textContent = pokemonData.name;
        pokemonSprite[0].src = pokemonData.sprites.front_default;

        pokemonSpeciesData = await pokeApi.getPokemonSpeciesById(pokemonNumber);
        pokemonDescription[0].textContent = pokemonSpeciesData.flavor_text_entries[actualVersion].flavor_text;
        pokemonHeight.textContent = pokemonData.height / 10 + " m";
        pokemonWeight.textContent = pokemonData.weight / 10 + " kg";

        mostrarStats(pokemonData.stats);

        switch (pokemonSpeciesData.gender_rate) {
            case -1:
                pokemonSex.textContent = "Desconocido"
                break;
            case 0:
                pokemonSex.textContent = "♂"
                break;
            case 1:
            case 4:
                pokemonSex.textContent = "♂ ♀"
                break;
            case 8:
                pokemonSex.textContent = "♀"
                break;
            default:
                break;
        }
        try {
            pokemonGenus.textContent = pokemonSpeciesData.genera[7].genus;
        }
        catch (e) {
            pokemonGenus.textContent = pokemonSpeciesData.genera[3].genus;
        }
        let habilidades = pokemonData.abilities;
        pokemonAbility.innerHTML = ''
        habilidades.forEach(habilidad => {
            let ability = document.createElement('div')
            ability.textContent = habilidad.ability.name
            ability.classList.add('attribute-value')
            pokemonAbility.append(ability)
        })
        pokemonTypes.innerHTML = ''
        pokemonData.types.forEach(type => {
            let typeElement = document.createElement('div')
            typeElement.textContent = type.type.name
            typeElement.classList.add('col-4', 'background-color-' + type.type.name, "text-center")
            pokemonTypes.append(typeElement)
        })
        const [debilidades, fortalezas, nulos] = await pokeApi.getTypeTable(pokemonData.types);
        const debilidadesFinales = pokeApi.filterWeakness(debilidades, fortalezas, nulos);
        pokemonWeakness.innerHTML = ''

        debilidadesFinales.forEach(debilidad => {
            let debilidadElement = document.createElement('div')
            debilidadElement.textContent = debilidad
            debilidadElement.classList.add('col-4', 'background-color-' + debilidad, "text-center")
            pokemonWeakness.append(debilidadElement)
        })
    };

    function convertirStatABarras(baseStat) {
        const totalLineas = 10;

        // 255 es el máximo teórico habitual para un stat base de PokéAPI.
        const barras = Math.ceil((baseStat / 255) * totalLineas);

        // Garantiza un valor entre 0 y 10.
        return Math.max(0, Math.min(totalLineas, barras));
    }

    function mostrarStats(stats) {
        pokemonStats.innerHTML = "";

        stats.forEach(stat => {
            const baseStat = stat.base_stat;
            const nombreStat = stat.stat.name;

            const nombreVisible = nombresStats[nombreStat] ?? nombreStat;
            const barrasActivas = convertirStatABarras(baseStat);

            const columna = document.createElement("div");
            columna.classList.add("stat-column");

            const total = document.createElement("div");
            total.classList.add("stat-total");
            total.textContent = baseStat;

            const barras = document.createElement("div");
            barras.classList.add("stat-bars");

            for (let i = 0; i < 10; i++) {
                const linea = document.createElement("div");
                linea.classList.add("stat-line");

                if (i < barrasActivas) {
                    linea.classList.add("active");
                }

                barras.append(linea);
            }

            const nombre = document.createElement("div");
            nombre.classList.add("stat-name");
            nombre.textContent = nombreVisible;

            columna.append(total, barras, nombre);
            pokemonStats.append(columna);
        });
    }
});