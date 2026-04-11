export type Viktim = {
    id?: string | number;
    fullName?: string;
    status?: Status | string;
    date?: string;
    zone?: string;
    city?: string;
    details?: string;
    amount?: number;
    latitude?: number | string;
    longitude?: number | string;
    imageSource?: string;
};

export enum Status {
    FREE = 0,
    DIE = 1,
    NOTFOUND = 2,
    SEKESTRE = 3,
}
