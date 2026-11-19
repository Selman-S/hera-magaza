export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Formun yeniden çizilmesinde gönderilen değerleri korumak için. */
  values?: Record<string, unknown>;
};

export const initialActionState: ActionState = { ok: false };
