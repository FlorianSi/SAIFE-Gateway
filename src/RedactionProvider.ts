import { IRedactionProvider } from './types';
import RE2 from 're2';

export class DefaultRedactionProvider implements IRedactionProvider {
  private emailRegex = new RE2(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
  private phoneRegex = new RE2(/(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\s*/g);
  // German Personalausweis (L,M,N,P,R,T,V,W,X,Y 9 chars) and Steuer-ID (11 digits)
  private idRegex = new RE2(/\b(?:[LMNPRTVWXY][A-Z0-9]{8}|\d{11})\b/gi);

  public redact(input: string): string {
    let safeInput = input;
    safeInput = safeInput.replace(this.emailRegex, '[REDACTED_EMAIL]');
    safeInput = safeInput.replace(this.phoneRegex, '[REDACTED_PHONE]');
    safeInput = safeInput.replace(this.idRegex, '[REDACTED_ID]');
    return safeInput;
  }
}
