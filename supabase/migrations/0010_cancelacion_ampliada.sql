-- Cancelación ampliada: hasta ahora "cancelar" era solo el comprador
-- pidiendo el reembolso desde funds_held. Se abre a cualquiera de las dos
-- partes, en cualquier estado no terminal salvo release_pending. Antes de
-- que haya plata retenida (awaiting_acceptance/awaiting_payment) no hay
-- nada que reembolsar, así que hace falta un estado terminal propio.

alter type trato_status add value 'cancelled';

alter table tratos
  add column cancelled_by_role text check (cancelled_by_role in ('comprador', 'vendedor'));
