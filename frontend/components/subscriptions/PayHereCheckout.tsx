"use client";

import { useEffect, useRef } from "react";

type Props = {
  checkoutUrl: string;
  fields: Record<string, string>;
  onError?: () => void;
};

export default function PayHereCheckout({ checkoutUrl, fields, onError }: Props) {
  const submitted = useRef(false);

  useEffect(() => {
    if (submitted.current) return;
    submitted.current = true;

    const form = document.createElement("form");
    form.method = "POST";
    form.action = checkoutUrl;
    form.style.display = "none";

    for (const [name, value] of Object.entries(fields)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }

    document.body.appendChild(form);
    try {
      form.submit();
    } catch {
      onError?.();
    }
  }, [checkoutUrl, fields, onError]);

  return (
    <p className="rounded-lg bg-violet-50 px-4 py-6 text-center text-sm text-violet-900 dark:bg-violet-950/40 dark:text-violet-100">
      Redirecting to PayHere secure checkout…
    </p>
  );
}
