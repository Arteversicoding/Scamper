// tab2.page.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss']
})
export class Tab2Page {
  newsItems = [
    {
      title: 'Berita Pertama',
      image: 'assets/news1.jpg',
      content: 'Ini adalah konten berita pertama.'
    },
    // Tambahkan berita lainnya di sini
  ];
}