import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

type Role = 'user' | 'assistant' | 'system';

interface Message {
  id: string;
  role: Role;
  content: string;
  ts: number;
}

interface Conversation {
  id: string;
  title: string;
  repoOwner: string;
  repoName: string;
  repoUrl: string;
  messages: Message[];
  createdAt: number;
  viewer: 'github1s' | 'vscode';
  iframeUrl: SafeResourceUrl | null;
}

const GITHUB_URL_REGEX =
  /^(?:(?:https?:\/\/(?:www\.)?github\.com\/([^\/\s]+)\/([^\/\s]+))(?:\/.*)?|git@github\.com:([^\/\s]+)\/([^\/\s]+))$/i;

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, ReactiveFormsModule],
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
})
export class ChatPage {
  conversations: Conversation[] = [];
  selectedId: string | null = null;

  form = this.fb.group({
    repoUrl: ['', [Validators.required, Validators.pattern(GITHUB_URL_REGEX)]],
  });

  constructor(private fb: FormBuilder, private sanitizer: DomSanitizer) {
    // Start with an empty conversation (no repo yet)
    this.newChat();
  }

  get current(): Conversation | null {
    return this.conversations.find(c => c.id === this.selectedId) ?? null;
  }

  /** true when a repo has been provided and we can show the IDE */
  hasRepo(c: Conversation | null): boolean {
    return !!c && !!c.repoOwner && !!c.repoName && c.repoUrl !== '—';
  }

  private toGithub1s(owner: string, name: string) {
    return `https://github1s.com/${owner}/${name}`;
  }
  private toVscodeDev(owner: string, name: string) {
    return `https://vscode.dev/github/${owner}/${name}`;
  }

  private normalizeRepoUrl(input: string): { owner: string; name: string } | null {
    const raw = (input || '').trim();
    const m = raw.match(GITHUB_URL_REGEX);
    if (!m) return null;

    const owner = (m[1] || m[3] || '').trim();
    let name = (m[2] || m[4] || '').trim();
    if (!owner || !name) return null;

    if (name.toLowerCase().endsWith('.git')) name = name.slice(0, -4);
    name = name.replace(/\/+$/, '');
    if (name.includes('/')) name = name.split('/')[0];

    return { owner, name };
  }

  private push(conv: Conversation, role: Role, content: string) {
    const m: Message = { id: crypto.randomUUID(), role, content, ts: Date.now() };
    const idx = this.conversations.findIndex(c => c.id === conv.id);
    if (idx < 0) return;
    const list = [...this.conversations];
    list[idx] = { ...list[idx], messages: [...list[idx].messages, m] };
    this.conversations = list;
  }

  private updateConv(id: string, patch: Partial<Conversation>) {
    const idx = this.conversations.findIndex(c => c.id === id);
    if (idx < 0) return;
    const copy = [...this.conversations];
    copy[idx] = { ...copy[idx], ...patch };
    this.conversations = copy;
  }

  newChat() {
    const now = Date.now();
    const conv: Conversation = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      repoOwner: '',
      repoName: '',
      repoUrl: '—',
      messages: [
        { id: crypto.randomUUID(), role: 'system', content: 'Paste a GitHub repository URL to start.', ts: now },
      ],
      createdAt: now,
      viewer: 'github1s',
      iframeUrl: null,
    };
    this.conversations = [conv, ...this.conversations];
    this.selectedId = conv.id;
    this.form.reset({ repoUrl: '' });
  }

  selectConversation(id: string) {
    this.selectedId = id;
  }

  deleteConversation(id: string) {
    this.conversations = this.conversations.filter(c => c.id !== id);
    if (this.selectedId === id) this.selectedId = this.conversations[0]?.id ?? null;
  }

  setViewer(viewer: 'github1s' | 'vscode' | undefined) {
    if (!viewer) return;
    const conv = this.current;
    if (!conv) return;
    const { repoOwner: owner, repoName: name } = conv;

    if (viewer === 'github1s') {
      const src = this.toGithub1s(owner, name);
      this.updateConv(conv.id, {
        viewer,
        iframeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(src),
      });
    } else {
      this.updateConv(conv.id, { viewer, iframeUrl: null });
    }
  }

  onViewerChange(evt: any) {
    const value: string | undefined = evt?.detail?.value;
    if (value === 'github1s' || value === 'vscode') {
      this.setViewer(value);
    } else {
      this.setViewer('github1s');
    }
  }

  openExternally() {
    const conv = this.current;
    if (!conv) return;
    const url = this.toVscodeDev(conv.repoOwner, conv.repoName);
    window.open(url, '_blank', 'noopener');
  }

  submit() {
    const conv = this.current;
    if (!conv) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.value.repoUrl!;
    const norm = this.normalizeRepoUrl(raw);

    if (!norm) {
      this.push(conv, 'assistant', 'Could not parse that URL. Use https://github.com/owner/repo');
      return;
    }

    const { owner, name } = norm;
    const cleanUrl = `https://github.com/${owner}/${name}`;

    this.push(conv, 'user', raw.trim());

    const iframe = this.sanitizer.bypassSecurityTrustResourceUrl(this.toGithub1s(owner, name));
    this.updateConv(conv.id, {
      repoOwner: owner,
      repoName: name,
      title: name,
      repoUrl: cleanUrl,
      // viewer remains the same; iframe set to show IDE
      iframeUrl: iframe
    });

    setTimeout(() => {
      const c = this.current;
      if (!c) return;
      this.push(c, 'assistant', `Opening **${owner}/${name}** in an embedded VS Code viewer…`);
    }, 120);

    this.form.reset({ repoUrl: '' });
  }

  get urlError(): string | null {
    const c = this.form.controls.repoUrl;
    if (!c.touched && !c.dirty) return null;
    if (c.hasError('required')) return 'GitHub URL required.';
    if (c.hasError('pattern')) return 'Use a GitHub repo like https://github.com/owner/repo';
    return null;
  }

  trackByMsg(_i: number, m: Message) { return m.id; }
  trackByConv(_i: number, c: Conversation) { return c.id; }
}
