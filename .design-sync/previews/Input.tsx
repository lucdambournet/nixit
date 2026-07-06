import { Input } from 'nixit';

export function Default() {
  return <Input label="Username" placeholder="your_handle" />;
}

export function WithError() {
  return <Input label="Email" value="not-an-email" error="Enter a valid email address" />;
}
