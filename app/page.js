'use client';
import PasscodeGate from '../components/PasscodeGate';
import Dashboard from '../components/Dashboard';

export default function Page() {
  return (
    <PasscodeGate>
      <Dashboard />
    </PasscodeGate>
  );
}
