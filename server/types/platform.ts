export type Platform = {
  url: string;
  name: string;
  clientId: string;
  authenticationEndpoint: string;
  accesstokenEndpoint: string;
  authConfig: {
    method: string;
    key: string;
  };
  kid: string;
};
