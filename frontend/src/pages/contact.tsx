import React, { useState } from 'react';
import Head from 'next/head';

export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    try {
      const res = await fetch('/api/v1/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message })
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to send message.');
        return;
      }
      setSubmitted(true);
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setError('Failed to send message. Please try again later.');
    }
  };

  return (
    <>
      <Head>
        <title>Contact Us | Land Valuation System</title>
      </Head>
      <div className="max-w-xl mx-auto py-16 px-4">
        <h1 className="text-3xl font-bold mb-6">Contact Us</h1>
        <p className="mb-6 text-gray-700">For any inquiries, suggestions, or support, please fill out the form below. Our team will respond as soon as possible. You can also email us directly at <a href="mailto:support@kcoders.org" className="text-blue-600 underline">support@kcoders.org</a>.</p>
        {submitted ? (
          <div className="bg-green-100 text-green-800 p-4 rounded mb-6">Thank you for contacting us! We will get back to you soon.</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 rounded shadow">
            <div>
              <label className="block mb-1 font-medium">Name</label>
              <input type="text" className="w-full border rounded px-3 py-2" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div>
              <label className="block mb-1 font-medium">Email</label>
              <input type="email" className="w-full border rounded px-3 py-2" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="block mb-1 font-medium">Message</label>
              <textarea className="w-full border rounded px-3 py-2" rows={5} value={message} onChange={e => setMessage(e.target.value)} required />
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded font-bold hover:bg-emerald-700">Send Message</button>
          </form>
        )}
      </div>
    </>
  );
}
