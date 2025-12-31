export interface GameRelease {
    console: string;
    date: string;
}

export interface ExternalIds {
    igdb?: string;
    steamGridDb?: string;
    steamDb?: string;
    retroAchievements?: string;
}

export interface Game {
    id: string;
    name: string;
    console?: string; // @deprecated - use platforms
    releaseDate?: string; // @deprecated - use platforms
    platforms?: GameRelease[];
    tags: string[];
    description?: string;
    externalIds?: ExternalIds;
    images?: {
        cover: string;
        background: string;
        square: string;
        vertical: string;
        horizontal: string;
        logo: string;
        icon: string;
        screenshots: string[];
    };
}
