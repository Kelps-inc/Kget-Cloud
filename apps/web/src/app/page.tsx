export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold">KGet Cloud</h1>
      <p className="mt-4 text-lg text-gray-600">
        Transform recurring business files into an AI-searchable knowledge base.
      </p>
      <div className="mt-8 flex gap-4">
        <a href="/register" className="rounded-md bg-blue-600 px-6 py-3 text-white hover:bg-blue-700">
          Get started
        </a>
        <a href="/login" className="rounded-md border px-6 py-3 hover:bg-gray-50">
          Sign in
        </a>
      </div>
    </main>
  );
}
