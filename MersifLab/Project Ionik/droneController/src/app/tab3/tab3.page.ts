import { Component } from '@angular/core';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss']
})
export class Tab3Page {
  newTodo: string = '';
  todos: { text: string; completed: boolean}[] = [];

  constructor() {}

  ngOnInit() {
    // Memuat to-do dari localStorage saat aplikasi dimulai
    const storedTodos = localStorage.getItem('todos');
    if (storedTodos) {
      this.todos = JSON.parse(storedTodos);
    }
  }
  
  addTodo() {
    if (this.newTodo.trim().length === 0) {
      return;
    }
    // Menambahkan to-do baru
    this.todos.push({ text: this.newTodo, completed: false});
    this.newTodo = '';

    // Simpan to-do ke localStorage
    this.saveTodos();
  }

  deleteTodo(index: number) {
    // Menghapus to-do
    this.todos.splice(index,1);

    // Simpan perubahan ke localStorage
    this.saveTodos();
  }

  saveTodos() {
    localStorage.setItem('todos', JSON.stringify(this.todos));
  }
}