import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { SearchBoxComponent } from './search-box/search-box.component';
import { RepositoryListComponent } from './repository-list/repository-list.component';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule, MatInputModule } from '@angular/material';
import { RepositoryService } from './repository.service';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  declarations: [AppComponent, SearchBoxComponent, RepositoryListComponent],
  imports: [BrowserModule, MatInputModule, MatFormFieldModule, FormsModule, HttpClientModule],
  providers: [RepositoryService],
  bootstrap: [AppComponent],
})
export class AppModule {}
