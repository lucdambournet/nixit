import { NixDateCard } from 'nixit';

export function Upcoming() {
  return (
    <NixDateCard
      month={7}
      year={2026}
      joined={14}
      total={25}
      status="upcoming"
      description="Every Nix Date is the first of the month. Join a cohort of up to 25 people and quit together."
      features={['Daily check-ins', 'Shared countdown timer', 'Cohort chat']}
      members={['jordan', 'alex', 'sam']}
    />
  );
}

export function Full() {
  return <NixDateCard month={6} year={2026} joined={25} total={25} status="full" />;
}
