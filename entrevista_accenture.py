import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import threading
import anthropic

# ── Configuracion ──────────────────────────────────────────
API_KEY = "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"
MODEL   = "claude-haiku-4-5-20251001"

PREGUNTAS = [
    ("Presentacion",
     "¿Cual es tu nombre completo?"),
    ("Experiencia y herramientas",
     "¿Cuantos años de experiencia tienes y con que herramientas trabajas habitualmente?\n(Excel, SQL, Python, Power BI...)"),
    ("Proyecto destacado",
     "Describe un proyecto donde hayas tenido que analizar datos o resolver un problema complejo."),
    ("Gestion bajo presion",
     "¿Como gestionas situaciones de presion o plazos ajustados con varios proyectos a la vez?"),
    ("Motivacion y objetivos",
     "¿Por que quieres trabajar en Accenture y cuales son tus objetivos profesionales a corto plazo?"),
]

# ── Paleta ─────────────────────────────────────────────────
BG      = "#0d0d0d"
CARD    = "#1a1a2e"
ACCENT  = "#7b2ff7"
ACCENT2 = "#00d4ff"
TEXT    = "#e8e8e8"
MUTED   = "#888888"
SUCCESS = "#00c896"
DARK2   = "#2e2e4e"

FONT_H1   = ("Segoe UI", 20, "bold")
FONT_H2   = ("Segoe UI", 12, "bold")
FONT_BODY = ("Segoe UI", 11)
FONT_SM   = ("Segoe UI", 9)


class EntrevistaApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Entrevista Accenture")
        self.geometry("820x580")
        self.minsize(600, 440)
        self.configure(bg=BG)

        self.respuestas  = {}
        self.indice      = 0
        self.resultado   = None   # texto devuelto por Claude

        # Marco exterior que ocupa toda la ventana y se estira
        self.container = tk.Frame(self, bg=BG)
        self.container.pack(fill="both", expand=True, padx=30, pady=24)

        self._mostrar_bienvenida()

    # ── Helpers ────────────────────────────────────────────
    def _limpiar(self):
        for w in self.container.winfo_children():
            w.destroy()

    def _card(self):
        """Frame con fondo de tarjeta que crece con la ventana."""
        f = tk.Frame(self.container, bg=CARD, padx=32, pady=26)
        f.pack(fill="both", expand=True)
        return f

    def _barra_progreso(self, parent, paso, total):
        wrap = tk.Frame(parent, bg=CARD)
        wrap.pack(fill="x", pady=(0, 18))

        dots = tk.Frame(wrap, bg=CARD)
        dots.pack(side="left")
        for i in range(total):
            color = ACCENT if i < paso else DARK2
            tk.Frame(dots, bg=color, width=90, height=5).pack(
                side="left", padx=3
            )

        tk.Label(wrap, text=f"Pregunta {paso} de {total}",
                 bg=CARD, fg=MUTED, font=FONT_SM).pack(side="right", anchor="s")

    def _boton(self, parent, texto, cmd, color=ACCENT, side="right"):
        b = tk.Button(
            parent, text=texto, command=cmd,
            bg=color, fg="white", font=FONT_H2,
            relief="flat", cursor="hand2",
            padx=20, pady=9, bd=0,
            activebackground=ACCENT2, activeforeground="white"
        )
        b.pack(side=side, padx=(0 if side == "right" else 0, 6))
        return b

    def _fila_nav(self, parent, atras_cmd=None, adelante_txt="Siguiente",
                  adelante_cmd=None, adelante_color=ACCENT):
        """Fila inferior con boton Atras (izq) y accion principal (der)."""
        fila = tk.Frame(parent, bg=CARD)
        fila.pack(fill="x", side="bottom", pady=(14, 0))

        if atras_cmd:
            self._boton(fila, "  Atras  ", atras_cmd, color=DARK2, side="left")
        if adelante_cmd:
            self._boton(fila, f"  {adelante_txt}  ", adelante_cmd,
                        color=adelante_color, side="right")

    # ── Pantalla 1: Bienvenida ─────────────────────────────
    def _mostrar_bienvenida(self):
        self._limpiar()
        self.indice   = 0
        self.resultado = None
        card = self._card()

        tk.Label(card, text="Accenture", bg=CARD,
                 fg=ACCENT, font=("Segoe UI", 10, "bold")).pack(anchor="w")
        tk.Label(card, text="Entrevista para Analista",
                 bg=CARD, fg=TEXT, font=FONT_H1).pack(anchor="w", pady=(4, 0))
        tk.Frame(card, bg=ACCENT, height=3).pack(fill="x", pady=(6, 20))

        desc = (
            "Vas a responder 5 preguntas sobre tu experiencia,\n"
            "habilidades y motivacion.\n\n"
            "Al finalizar, Claude analizara tus respuestas\n"
            "y te mostrara tus principales fortalezas."
        )
        tk.Label(card, text=desc, bg=CARD, fg=MUTED,
                 font=FONT_BODY, justify="left").pack(anchor="w", pady=(0, 30))

        self._fila_nav(card, adelante_txt="Comenzar entrevista",
                       adelante_cmd=self._mostrar_pregunta)

    # ── Pantalla 2: Preguntas ──────────────────────────────
    def _mostrar_pregunta(self):
        self._limpiar()
        clave, texto = PREGUNTAS[self.indice]
        card = self._card()

        self._barra_progreso(card, self.indice + 1, len(PREGUNTAS))

        tk.Label(card, text=texto, bg=CARD, fg=TEXT, font=FONT_H2,
                 wraplength=700, justify="left").pack(anchor="w", pady=(0, 14))

        self.text_area = scrolledtext.ScrolledText(
            card, font=FONT_BODY, bg="#0d0d2e", fg=TEXT,
            insertbackground=ACCENT2, relief="flat",
            wrap="word", padx=12, pady=10
        )
        self.text_area.pack(fill="both", expand=True, pady=(0, 6))
        self.text_area.focus()

        if clave in self.respuestas:
            self.text_area.insert("1.0", self.respuestas[clave])

        es_ultima = self.indice == len(PREGUNTAS) - 1
        adelante_txt = "Finalizar y analizar" if es_ultima else "Siguiente"

        atras_fn = (self._ir_anterior
                    if self.indice > 0
                    else self._mostrar_bienvenida)

        # Si ya hay resultado guardado y estamos en la ultima, permitir volver al resultado
        if es_ultima and self.resultado:
            self._fila_nav(
                card,
                atras_cmd=atras_fn,
                adelante_txt="Ver resultado",
                adelante_cmd=lambda: self._mostrar_resultado(self.resultado),
                adelante_color=SUCCESS
            )
            # Boton secundario para re-analizar
            fila_extra = tk.Frame(card, bg=CARD)
            fila_extra.pack(fill="x")
            self._boton(fila_extra, "  Re-analizar  ",
                        self._guardar_y_analizar, color=ACCENT, side="right")
        else:
            self._fila_nav(
                card,
                atras_cmd=atras_fn,
                adelante_txt=adelante_txt,
                adelante_cmd=(self._guardar_y_analizar
                              if es_ultima else self._ir_siguiente)
            )

    def _ir_anterior(self):
        self._guardar_respuesta_actual()
        self.indice -= 1
        self._mostrar_pregunta()

    def _ir_siguiente(self):
        if not self._guardar_respuesta_actual():
            return
        self.indice += 1
        self._mostrar_pregunta()

    def _guardar_respuesta_actual(self):
        clave = PREGUNTAS[self.indice][0]
        respuesta = self.text_area.get("1.0", "end").strip()
        if not respuesta:
            messagebox.showwarning("Respuesta vacia",
                                   "Escribe algo antes de continuar.")
            return False
        self.respuestas[clave] = respuesta
        return True

    def _guardar_y_analizar(self):
        if not self._guardar_respuesta_actual():
            return
        self._mostrar_analizando()

    # ── Pantalla 3: Cargando ───────────────────────────────
    def _mostrar_analizando(self):
        self._limpiar()
        card = self._card()

        tk.Frame(card, bg=CARD).pack(expand=True, fill="both")

        tk.Label(card, text="Analizando tu perfil...",
                 bg=CARD, fg=TEXT, font=FONT_H1).pack()
        tk.Label(card, text="Claude esta evaluando tus respuestas.",
                 bg=CARD, fg=MUTED, font=FONT_BODY).pack(pady=(6, 20))

        self.progress = ttk.Progressbar(card, mode="indeterminate")
        self.progress.pack(fill="x", padx=60, pady=10)
        self.progress.start(12)

        tk.Frame(card, bg=CARD).pack(expand=True, fill="both")

        threading.Thread(target=self._llamar_claude, daemon=True).start()

    def _llamar_claude(self):
        nombre = self.respuestas.get("Presentacion", "candidato").split()[0]
        texto  = "\n".join(f"- {k}: {v}" for k, v in self.respuestas.items())
        prompt = f"""Eres un experto en seleccion de talento para Accenture.
Tienes las respuestas de {nombre} a 5 preguntas de entrevista para Analista en Accenture.

{texto}

Elabora un resumen profesional con:
1. Las 3-5 principales FORTALEZAS del candidato, justificadas con sus respuestas.
2. Una valoracion general breve sobre su perfil para Accenture.
3. Recomendacion final: Apto / No apto / Con potencial.

Responde en español, tono profesional pero cercano. Sin emojis."""

        try:
            client = anthropic.Anthropic(api_key=API_KEY)
            msg = client.messages.create(
                model=MODEL, max_tokens=1024,
                messages=[{"role": "user", "content": prompt}]
            )
            texto_resultado = msg.content[0].text
        except Exception as e:
            texto_resultado = f"Error al conectar con Claude:\n{e}"

        self.resultado = texto_resultado
        self.after(0, self._mostrar_resultado, texto_resultado)

    # ── Pantalla 4: Resultado ──────────────────────────────
    def _mostrar_resultado(self, texto):
        self._limpiar()
        card = self._card()

        tk.Label(card, text="Accenture", bg=CARD,
                 fg=ACCENT, font=("Segoe UI", 10, "bold")).pack(anchor="w")
        tk.Label(card, text="Analisis de Fortalezas",
                 bg=CARD, fg=TEXT, font=FONT_H1).pack(anchor="w", pady=(4, 0))
        tk.Frame(card, bg=SUCCESS, height=3).pack(fill="x", pady=(6, 14))

        box = scrolledtext.ScrolledText(
            card, font=FONT_BODY, bg="#0d0d2e", fg=TEXT,
            relief="flat", wrap="word", padx=12, pady=10
        )
        box.pack(fill="both", expand=True, pady=(0, 6))
        box.insert("1.0", texto)
        box.config(state="disabled")

        fila = tk.Frame(card, bg=CARD)
        fila.pack(fill="x", side="bottom", pady=(14, 0))

        self._boton(fila, "  Nueva entrevista  ",
                    self._mostrar_bienvenida, color=DARK2, side="left")
        self._boton(fila, "  Revisar respuestas  ",
                    self._volver_a_preguntas, color=DARK2, side="left")
        self._boton(fila, "  Cerrar  ",
                    self.destroy, color=ACCENT, side="right")

    def _volver_a_preguntas(self):
        """Vuelve a la ultima pregunta para poder repasar y re-analizar."""
        self.indice = len(PREGUNTAS) - 1
        self._mostrar_pregunta()


if __name__ == "__main__":
    app = EntrevistaApp()
    app.mainloop()
