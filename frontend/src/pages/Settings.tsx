import { useAuth } from '@/contexts/AuthContext';

export function Settings() {
  const { user } = useAuth();

  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <div className="text-[10px] font-mono-alt uppercase tracking-[0.3em] text-[#3b3a37] dark:text-[#b9b3aa]">
          Settings
        </div>
        <h1 className="text-4xl font-black tracking-tight">Profile</h1>
        <p className="text-sm font-sans-alt text-[#3b3a37] dark:text-[#b9b3aa] max-w-md">
          Basic account details for the email you sign in with.
        </p>
      </section>

      <section className="border border-[#1c1b19] dark:border-[#2a2a2a] rounded-3xl p-6 bg-white/80 dark:bg-[#121212]">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="text-[10px] font-mono-alt uppercase tracking-[0.2em] text-[#3b3a37] dark:text-[#b9b3aa]">
              Full Name
            </div>
            <div className="mt-2 text-lg font-semibold">
              {user?.name || '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono-alt uppercase tracking-[0.2em] text-[#3b3a37] dark:text-[#b9b3aa]">
              Email
            </div>
            <div className="mt-2 text-lg font-semibold">
              {user?.email || '—'}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
