export type IDTokenPayload = {
  nonce: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  "https://purl.imsglobal.org/spec/lti/claim/deployment_id": string;
  "https://purl.imsglobal.org/spec/lti/claim/target_link_uri": string;
  sub: string;
  "https://purl.imsglobal.org/spec/lti/claim/lis": {
    person_sourcedid: string;
    course_section_sourcedid: string;
  };
  "https://purl.imsglobal.org/spec/lti/claim/roles": string[];
  "https://purl.imsglobal.org/spec/lti/claim/context": {
    id: string;
    label: string;
    title: string;
    type: string[];
  };
  "https://purl.imsglobal.org/spec/lti/claim/message_type": string;
  "https://purl.imsglobal.org/spec/lti/claim/resource_link": {
    title: string;
    description: string;
    id: string;
  };
  "https://purl.imsglobal.org/spec/lti-bo/claim/basicoutcome": {
    lis_result_sourcedid: string;
    lis_outcome_service_url: string;
  };
  given_name: string;
  family_name: string;
  name: string;
  "https://purl.imsglobal.org/spec/lti/claim/ext": {
    user_username: string;
    lms: string;
  };
  email: string;
  "https://purl.imsglobal.org/spec/lti/claim/launch_presentation": {
    locale: string;
    document_target: string;
    return_url: string;
  };
  "https://purl.imsglobal.org/spec/lti/claim/tool_platform": {
    product_family_code: string;
    version: string;
    guid: string;
    name: string;
    description: string;
  };
  "https://purl.imsglobal.org/spec/lti/claim/version": string;
  "https://purl.imsglobal.org/spec/lti/claim/custom": {
    resource_id: string;
    context_memberships_url: string;
  };
  "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint": {
    scope: string[];
    lineitems: string;
    lineitem: string;
  };
  "https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice": {
    context_memberships_url: string;
    service_versions: string[];
  };
  "https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings"?: {
    deep_link_return_url: string;
  };
};
