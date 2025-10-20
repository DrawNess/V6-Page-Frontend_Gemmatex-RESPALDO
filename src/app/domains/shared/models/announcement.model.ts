export interface Announcement {
  id: number;
  title: string;
  description?: string ;
  linkLabel?: string ;   // tu schema lo marcó como uri, si no lo usas, déjalo opcional
  linkUrl?: string;
  background?: string;
  textColor?: string;
  ordering?: number;
  is_active: boolean;
  startAt?: string ;      // viene string según tu Joi
  endAt?: string ;        // viene string según tu Joi
  hrefProductId?: number ;
}
