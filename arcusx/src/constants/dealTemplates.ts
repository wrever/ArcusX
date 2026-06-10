export type DealTemplateId =
  | 'peer_car_sale'
  | 'rental_agreement'
  | 'freelancer_service'
  | 'online_coaching'
  | 'home_repair'
  | 'other';

export interface DealTemplateMeta {
  id: DealTemplateId;
  labelKey: string;
  titleKey: string;
  descriptionKey: string;
  titlePlaceholderKey: string;
  descriptionPlaceholderKey: string;
  amountPlaceholderKey: string;
  defaultFunderRole: 'initiator' | 'counterparty';
  defaultReleaseSigner: 'initiator' | 'counterparty';
}

const base = (id: DealTemplateId, label: string, title: string, desc: string, amount: string, funder: 'initiator' | 'counterparty') => ({
  id,
  labelKey: `deals.template.${label}`,
  titleKey: `deals.template.${title}.title`,
  descriptionKey: `deals.template.${desc}.desc`,
  titlePlaceholderKey: `deals.placeholder.${title}.title`,
  descriptionPlaceholderKey: `deals.placeholder.${desc}.desc`,
  amountPlaceholderKey: `deals.placeholder.${amount}.amount`,
  defaultFunderRole: funder,
  defaultReleaseSigner: 'initiator' as const,
});

export const DEAL_TEMPLATES: DealTemplateMeta[] = [
  base('peer_car_sale', 'peer_car_sale', 'peer_car_sale', 'peer_car_sale', 'peer_car_sale', 'counterparty'),
  base('rental_agreement', 'rental', 'rental', 'rental', 'rental', 'counterparty'),
  {
    ...base('freelancer_service', 'freelancer', 'freelancer', 'freelancer', 'freelancer', 'initiator'),
    defaultReleaseSigner: 'initiator',
  },
  base('online_coaching', 'coaching', 'coaching', 'coaching', 'coaching', 'counterparty'),
  base('home_repair', 'repair', 'repair', 'repair', 'repair', 'counterparty'),
  base('other', 'other', 'other', 'other', 'other', 'counterparty'),
];

export function getDealTemplate(id: DealTemplateId): DealTemplateMeta {
  return DEAL_TEMPLATES.find((t) => t.id === id) ?? DEAL_TEMPLATES[DEAL_TEMPLATES.length - 1];
}
