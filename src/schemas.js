// Field catalogs per CRM/object. type: string|email|phone|date|number|picklist|bool|url
const f = (name, type = 'string', extra = {}) => ({ name, type, ...extra });

export const SCHEMAS = {
  hubspot: {
    contacts: [
      f('firstname'), f('lastname'), f('email', 'email', { required: true }), f('phone', 'phone'),
      f('mobilephone', 'phone'), f('jobtitle'), f('company'), f('lifecyclestage', 'picklist'),
      f('hs_lead_status', 'picklist'), f('createdate', 'date'), f('website', 'url'),
      f('city'), f('state'), f('country'), f('zip'),
    ],
    companies: [
      f('name', 'string', { required: true }), f('domain', 'url'), f('industry'), f('phone', 'phone'),
      f('numberofemployees', 'number'), f('annualrevenue', 'number'), f('city'), f('state'), f('country'),
      f('createdate', 'date'),
    ],
    deals: [
      f('dealname', 'string', { required: true }), f('amount', 'number'), f('dealstage', 'picklist'),
      f('closedate', 'date'), f('pipeline', 'picklist'), f('createdate', 'date'),
    ],
  },
  salesforce: {
    contacts: [
      f('FirstName'), f('LastName', 'string', { required: true }), f('Email', 'email'), f('Phone', 'phone'),
      f('MobilePhone', 'phone'), f('Title'), f('Account.Name'), f('LeadSource', 'picklist'),
      f('CreatedDate', 'date'), f('MailingCity'), f('MailingState'), f('MailingCountry'), f('MailingPostalCode'),
    ],
    companies: [
      f('Name', 'string', { required: true }), f('Website', 'url'), f('Industry', 'picklist'), f('Phone', 'phone'),
      f('NumberOfEmployees', 'number'), f('AnnualRevenue', 'number'), f('BillingCity'), f('BillingState'),
      f('BillingCountry'), f('CreatedDate', 'date'),
    ],
    deals: [
      f('Name', 'string', { required: true }), f('Amount', 'number'), f('StageName', 'picklist'),
      f('CloseDate', 'date'), f('CreatedDate', 'date'),
    ],
  },
  pipedrive: {
    contacts: [
      f('first_name'), f('last_name'), f('name', 'string', { required: true }), f('email', 'email'),
      f('phone', 'phone'), f('job_title'), f('org_name'), f('add_time', 'date'),
    ],
    companies: [
      f('name', 'string', { required: true }), f('address_locality'), f('address_country'),
      f('people_count', 'number'), f('add_time', 'date'),
    ],
    deals: [
      f('title', 'string', { required: true }), f('value', 'number'), f('stage_id', 'picklist'),
      f('expected_close_date', 'date'), f('add_time', 'date'),
    ],
  },
};

// Concepts that different CRMs name differently. Tokens within a group are equivalent.
export const SYNONYMS = [
  ['firstname', 'first', 'given', 'fname'],
  ['lastname', 'last', 'surname', 'family', 'lname'],
  ['email', 'mail', 'emailaddress'],
  ['phone', 'telephone', 'tel', 'work'],
  ['mobile', 'mobilephone', 'cell'],
  ['jobtitle', 'title', 'position', 'role'],
  ['company', 'account', 'organization', 'org', 'orgname', 'accountname'],
  ['createdate', 'createddate', 'addtime', 'created', 'createdat'],
  ['closedate', 'expectedclosedate'],
  ['amount', 'value', 'dealvalue'],
  ['dealname', 'title', 'opportunityname'],
  ['dealstage', 'stagename', 'stageid', 'stage'],
  ['website', 'domain', 'url'],
  ['numberofemployees', 'peoplecount', 'employees', 'headcount'],
  ['annualrevenue', 'revenue'],
  ['zip', 'postalcode', 'postcode'],
  ['state', 'province', 'region'],
  ['city', 'locality', 'town'],
  ['country', 'nation'],
  ['leadsource', 'hsleadstatus', 'source'],
];
