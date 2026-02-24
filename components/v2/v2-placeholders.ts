export type CountryTabCode = "UY" | "AR" | "BR" | "MX" | "CL";

export interface CountryPlaceholderCard {
  id: string;
  title: string;
  excerpt: string;
}

export interface PlaceholderCard {
  id: string;
  title: string;
  excerpt: string;
}

export const COUNTRY_TABS: CountryTabCode[] = ["UY", "AR", "BR", "MX", "CL"];

export const COUNTRY_PLACEHOLDER_CONTENT: Record<CountryTabCode, CountryPlaceholderCard[]> = {
  UY: [
    {
      id: "uy-1",
      title: "Uruguay: cobertura local en preparación",
      excerpt: "Próximamente selección editorial de noticias con enfoque por país."
    },
    {
      id: "uy-2",
      title: "Temas clave para Uruguay",
      excerpt: "Espacio reservado para política, economía y sociedad."
    }
  ],
  AR: [
    {
      id: "ar-1",
      title: "Argentina: cobertura local en preparación",
      excerpt: "Próximamente selección editorial de noticias con enfoque por país."
    },
    {
      id: "ar-2",
      title: "Temas clave para Argentina",
      excerpt: "Espacio reservado para política, economía y sociedad."
    }
  ],
  BR: [
    {
      id: "br-1",
      title: "Brasil: cobertura local en preparación",
      excerpt: "Próximamente selección editorial de noticias con enfoque por país."
    },
    {
      id: "br-2",
      title: "Temas clave para Brasil",
      excerpt: "Espacio reservado para política, economía y sociedad."
    }
  ],
  MX: [
    {
      id: "mx-1",
      title: "México: cobertura local en preparación",
      excerpt: "Próximamente selección editorial de noticias con enfoque por país."
    },
    {
      id: "mx-2",
      title: "Temas clave para México",
      excerpt: "Espacio reservado para política, economía y sociedad."
    }
  ],
  CL: [
    {
      id: "cl-1",
      title: "Chile: cobertura local en preparación",
      excerpt: "Próximamente selección editorial de noticias con enfoque por país."
    },
    {
      id: "cl-2",
      title: "Temas clave para Chile",
      excerpt: "Espacio reservado para política, economía y sociedad."
    }
  ]
};

export const AGENDA_PLACEHOLDER_CARDS: PlaceholderCard[] = [
  {
    id: "agenda-1",
    title: "Agenda regional",
    excerpt: "Próximamente agenda por país"
  },
  {
    id: "agenda-2",
    title: "Calendario editorial",
    excerpt: "Próximamente agenda por país"
  }
];

export const SPORTS_PLACEHOLDER_CARDS: PlaceholderCard[] = [
  {
    id: "sports-1",
    title: "Cobertura deportiva",
    excerpt: "Próximamente deportes"
  },
  {
    id: "sports-2",
    title: "Resultados y contexto",
    excerpt: "Próximamente deportes"
  }
];

export const POP_PLACEHOLDER_CARDS: PlaceholderCard[] = [
  {
    id: "pop-1",
    title: "Pop / Entretenimiento",
    excerpt: "Próximamente cobertura de cultura, entretenimiento y tendencias."
  },
  {
    id: "pop-2",
    title: "Historias culturales",
    excerpt: "Espacio reservado para lanzamientos, streaming y escena regional."
  }
];

