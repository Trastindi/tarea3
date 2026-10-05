import * as pokeApi from "./pokeApi/api.js";

const LIMIT = 1025;

const statLabels = {
  hp: "PS",
  attack: "ATAQUE",
  defense: "DEFENSA",
  "special-attack": "ATQ. ESP.",
  "special-defense": "DEF. ESP.",
  speed: "VELOCIDAD"
};

const getById = (id) => document.getElementById(id);

const normaliseReference = (value) => {
  const text = String(value ?? "").trim().toLowerCase();

  if (!text) {
    return null;
  }

  if (/^\d+$/.test(text)) {
    return Math.min(LIMIT, Math.max(1, Number(text)));
  }

  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
};

const capitalise = (value = "") =>
  value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, " ");

const formatDexNumber = (id) => `#${String(id).padStart(3, "0")}`;

const getLanguageEntry = (entries = [], language = "es") =>
  entries.find((entry) => entry.language?.name === language) ??
  entries.find((entry) => entry.language?.name === "en") ??
  entries[0] ??
  null;

const clearText = (text = "") =>
  text.replace(/[\n\f\r]/g, " ").replace(/\s+/g, " ").trim();

const getArtwork = (pokemon) =>
  pokemon.sprites?.other?.["official-artwork"]?.front_default ||
  pokemon.sprites?.other?.home?.front_default ||
  pokemon.sprites?.front_default ||
  "";

const getGender = (genderRate) => {
  if (genderRate === -1) return "DESCONOCIDO";
  if (genderRate === 0) return "♂";
  if (genderRate === 8) return "♀";
  return "♂ / ♀";
};

const getGenus = (genera = []) => {
  const genus = getLanguageEntry(genera)?.genus ?? "DESCONOCIDA";
  return genus.replace(/\s*Pokémon\s*$/i, "").trim().toUpperCase();
};

const getStatSegments = (baseStat) =>
  Math.max(0, Math.min(10, Math.ceil((baseStat / 255) * 10)));

window.addEventListener("DOMContentLoaded", () => {
  const form = getById("pokemonForm");
  const input = getById("pokemonId");

  const previousButton = getById("back");
  const nextButton = getById("next");

  const title = getById("pokemonTitle");
  const headerTitle = getById("pokemonHeaderTitle");
  const sprite = getById("pokemonSprite");

  const height = getById("altura");
  const weight = getById("peso");
  const gender = getById("sexo");
  const category = getById("categoria");

  const typesContainer = getById("tipo");
  const abilitiesContainer = getById("habilidad");
  const weaknessesContainer = getById("debilidad");
  const description = getById("pokemonDescription");
  const statsContainer = getById("pokemonStats");

  const previousLabel = getById("previousPokemon");
  const nextLabel = getById("nextPokemon");
  const status = getById("pokemonStatus");

  const numberButtons = [
    ...document.querySelectorAll("[data-pokemon-number]")
  ];

  const keypadActionButtons = [
    ...document.querySelectorAll("[data-keypad-action]")
  ];

  const filterButtons = [
    ...document.querySelectorAll("[data-type-filter]")
  ];

  let currentPokemonId = 25;
  let currentPokemon = null;
  let isLoading = false;
  let keypadBuffer = "";

  function setStatus(message) {
    if (status) {
      status.textContent = message;
    }
  }

  function setControlsDisabled(disabled) {
    [
      previousButton,
      nextButton,
      ...numberButtons,
      ...keypadActionButtons,
      ...filterButtons
    ]
      .filter(Boolean)
      .forEach((element) => {
        element.disabled = disabled;
        element.setAttribute("aria-busy", String(disabled));
      });
  }

  function createTag(value, classPrefix) {
    const tag = document.createElement("span");

    const safeName = value.toLowerCase().replace(/\s+/g, "-");

    tag.className = `${classPrefix}-tag ${classPrefix}-${safeName}`;
    tag.textContent = value.toUpperCase();

    return tag;
  }

  function renderTags(container, values, classPrefix) {
    if (!container) return;

    container.replaceChildren();

    if (!values.length) {
      container.textContent = "SIN DATOS";
      return;
    }

    values.forEach((value) => {
      container.append(createTag(value, classPrefix));
    });
  }

  function renderStats(stats) {
    if (!statsContainer) return;

    statsContainer.replaceChildren();

    stats.forEach((stat) => {
      const row = document.createElement("div");
      row.className = "stat-row";

      const label = document.createElement("span");
      label.className = "stat-label";
      label.textContent =
        statLabels[stat.stat.name] ?? stat.stat.name.toUpperCase();

      const meter = document.createElement("span");
      meter.className = "stat-meter";
      meter.setAttribute(
        "aria-label",
        `${label.textContent}: ${stat.base_stat}`
      );

      const segments = getStatSegments(stat.base_stat);

      for (let index = 0; index < 10; index += 1) {
        const segment = document.createElement("i");
        segment.className = `stat-segment${
          index < segments ? " is-active" : ""
        }`;

        meter.append(segment);
      }

      const value = document.createElement("strong");
      value.className = "stat-value";
      value.textContent = stat.base_stat;

      row.append(label, meter, value);
      statsContainer.append(row);
    });
  }

  async function calculateWeaknesses(types) {
    try {
      const [weaknesses, strengths, immunities] =
        await pokeApi.getTypeTable(types);

      return pokeApi.filterWeakness(weaknesses, strengths, immunities);
    } catch (error) {
      console.warn("No se pudieron calcular las debilidades.", error);
      return [];
    }
  }

  async function updateNavigationLabels(pokemonId) {
    const previousId = pokemonId <= 1 ? LIMIT : pokemonId - 1;
    const nextId = pokemonId >= LIMIT ? 1 : pokemonId + 1;

    if (previousLabel) {
      previousLabel.textContent = `← ${formatDexNumber(previousId)}`;
    }

    if (nextLabel) {
      nextLabel.textContent = `${formatDexNumber(nextId)} →`;
    }
  }

  async function loadPokemon(reference) {
    const pokemonReference = normaliseReference(reference);

    if (!pokemonReference || isLoading) {
      return;
    }

    isLoading = true;
    document.body.classList.add("is-loading");
    setControlsDisabled(true);
    setStatus("ESCANEANDO…");

    try {
      const pokemon = await pokeApi.getPokemonById(pokemonReference);

      if (!pokemon) {
        throw new Error("Pokémon no encontrado");
      }

      const species = await pokeApi.getPokemonSpeciesById(pokemon.id);

      currentPokemonId = pokemon.id;
      currentPokemon = pokemon;

      const dexNumber = formatDexNumber(pokemon.id);
      const name = capitalise(pokemon.name);
      const displayTitle = `${dexNumber} • ${name.toUpperCase()}`;

      const speciesEntry = getLanguageEntry(species.flavor_text_entries);
      const flavorText = clearText(
        speciesEntry?.flavor_text ?? "SIN REGISTRO DISPONIBLE."
      );

      const types = pokemon.types.map((item) => item.type.name);
      const abilities = pokemon.abilities.map((item) => item.ability.name);
      const weaknesses = await calculateWeaknesses(pokemon.types);

      if (title) title.textContent = displayTitle;
      if (headerTitle) headerTitle.textContent = displayTitle;

      if (sprite) {
        sprite.src = getArtwork(pokemon);
        sprite.alt = `Ilustración oficial de ${name}`;
      }

      if (height) height.textContent = `${pokemon.height / 10} M`;
      if (weight) weight.textContent = `${pokemon.weight / 10} KG`;
      if (gender) gender.textContent = getGender(species.gender_rate);
      if (category) category.textContent = getGenus(species.genera);
      if (description) description.textContent = flavorText;

      renderTags(typesContainer, types, "type");
      renderTags(abilitiesContainer, abilities, "ability");
      renderTags(weaknessesContainer, weaknesses, "weakness");
      renderStats(pokemon.stats);

      if (input) {
        input.value = pokemon.id;
      }

      await updateNavigationLabels(pokemon.id);

      setStatus(`REGISTRO ${dexNumber} CARGADO`);
    } catch (error) {
      console.error(error);

      setStatus("ERROR: REGISTRO NO ENCONTRADO");

      if (description) {
        description.textContent =
          "NO SE HA PODIDO RECUPERAR EL REGISTRO SOLICITADO. REVISA EL NÚMERO O EL NOMBRE.";
      }
    } finally {
      isLoading = false;
      document.body.classList.remove("is-loading");
      setControlsDisabled(false);
    }
  }

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    loadPokemon(input?.value);
  });

  input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      loadPokemon(input.value);
    }
  });

  previousButton?.addEventListener("click", (event) => {
    event.preventDefault();

    const previousId = currentPokemonId <= 1 ? LIMIT : currentPokemonId - 1;
    loadPokemon(previousId);
  });

  nextButton?.addEventListener("click", (event) => {
    event.preventDefault();

    const nextId = currentPokemonId >= LIMIT ? 1 : currentPokemonId + 1;
    loadPokemon(nextId);
  });

  numberButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();

      const digit = button.dataset.pokemonNumber;

      if (!/^\d$/.test(digit)) {
        return;
      }

      keypadBuffer = `${keypadBuffer}${digit}`.slice(-4);

      if (input) {
        input.value = keypadBuffer;
        input.focus();
      }

      setStatus(`ENTRADA: ${keypadBuffer}`);
    });
  });

  keypadActionButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();

      const action = button.dataset.keypadAction;

      if (action === "clear") {
        keypadBuffer = "";

        if (input) {
          input.value = "";
          input.focus();
        }

        setStatus("ENTRADA BORRADA");
        return;
      }

      if (action === "enter") {
        const reference = keypadBuffer || input?.value;

        keypadBuffer = "";
        loadPokemon(reference);
      }
    });
  });

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const requestedType = button.dataset.typeFilter;

      filterButtons.forEach((filterButton) => {
        const isActive = filterButton === button;

        filterButton.classList.toggle("is-active", isActive);
        filterButton.setAttribute("aria-pressed", String(isActive));
      });

      if (!currentPokemon || requestedType === "all") {
        setStatus("FILTRO: TODOS LOS TIPOS");
        return;
      }

      const containsType = currentPokemon.types.some(
        (item) => item.type.name === requestedType
      );

      setStatus(
        containsType
          ? `FILTRO ${requestedType.toUpperCase()}: COINCIDENCIA`
          : `FILTRO ${requestedType.toUpperCase()}: SIN COINCIDENCIA`
      );
    });
  });

  getById("voiceButton")?.addEventListener("click", () => {
    setStatus("DEX VOICE: CANAL DE AUDIO NO DISPONIBLE");
  });

  getById("cryButton")?.addEventListener("click", () => {
    if (!currentPokemon) {
      return;
    }

    const cryUrl =
      currentPokemon.cries?.latest || currentPokemon.cries?.legacy || "";

    if (!cryUrl) {
      setStatus("CRY SYNTH: AUDIO NO DISPONIBLE");
      return;
    }

    const cry = new Audio(cryUrl);

    cry.play()
      .then(() => setStatus("CRY SYNTH: REPRODUCIENDO"))
      .catch(() => setStatus("CRY SYNTH: BLOQUEADO POR EL NAVEGADOR"));
  });

  loadPokemon(currentPokemonId);
});