import {Component, OnInit, ViewChild} from '@angular/core';
import {Router} from "@angular/router";
import {EditorConfig} from "../../../config/editorConfig";
import {NbAuthService} from '@nebular/auth'
import {AuthService} from "../../../service/auth.service";
import {HttpClient} from "@angular/common/http";
import {EditorDirective} from "../../../directive/editor.directive";
import {NbToastrService} from "@nebular/theme";
import {ArticleCreate, ArticleItem} from "../../../interface/article";
import {ArticleService} from "../../../service/article.service";
import {debounceTime, distinctUntilChanged, switchMap} from "rxjs/operators";
import {Subject} from "rxjs";
import {Pagination} from "../../../interface";
import {DeleteEventArgs} from '@syncfusion/ej2-angular-buttons'
import {DialogComponent} from '@syncfusion/ej2-angular-popups';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
  providers: [NbAuthService, HttpClient, ArticleService, NbToastrService]
})
export class ListComponent implements OnInit {

  conf = new EditorConfig({
    height: '100%',
    toolbarIcons: ["undo", "redo", "bold", "hr", "fullscreen", "image", "||", "save", "watch", "preview"],
    lang: {
      toolbar: {
        save: '保存',
        undo: "撤销"
      }
    },
    toolbarIconsClass: {
      save: "fa-save"
    },
    toolbarHandlers: {
      save: this.save.bind(this)
    }
  });
  public cellSpacing: number[] = [20, 0]
  public aspectRatio: any = 100 / 56;

  @ViewChild(EditorDirective, {static: false})
  private editorMdDirective: EditorDirective;

  public title: string
  public content: string
  private created$ = new Subject<ArticleCreate>();
  public article: Pagination<ArticleItem>  // 文章列表
  public articleID: string

  // UI组件
  public confirmContent: string = ''
  public visible: boolean = false
  @ViewChild('confirmDialog') ejDialog: DialogComponent;

  constructor(private router: Router, private auth: AuthService, private http: HttpClient, private toast: NbToastrService, private articleService: ArticleService) {
  }

  ngOnInit(): void {
    this.articleList()
    this.created$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      switchMap((data: ArticleCreate) => this.articleID ? this.articleService.update(data, this.articleID) : this.articleService.post(data))
    ).subscribe((x: string) => {
      if (!x) return
      this.toast.success("保存文章成功", "Notice")
      const article = this.article
      const data = this.article.data || []
      this.article = this.articleID ?
        {
          ...article,
          data: article.data.map((item) => (this.articleID == item.id ? {
            ...item,
            title: this.title,
            content: this.content
          } : item))
        }
        :
        {
          count: this.article.count + 1,
          data: [...data, {id: x, title: this.title, content: this.content, status: 1, projects: []}]
        }
    })

  }

  clearEditor() {
    this.editorMdDirective.clearContent()
    this.title = ''
    this.content = ''
    this.articleID = ''
  }

  save() {
    this.content = this.editorMdDirective.getMarkdown()
    if (!this.content || !this.title) {
      this.toast.warning("请输入标题或者内容", "Notice")
      return
    }
    this.created$.next(<ArticleCreate>{
      title: this.title,
      content: this.content
    })
  }

  // 标题获取焦点状态
  public focusIn(target: HTMLElement): void {
    target.parentElement.classList.add('e-input-focus');
  }

  // 文章列表
  articleList() {
    this.articleService.get().subscribe((x: Pagination<ArticleItem>) => this.article = x)
  }

  // 加载详情
  loadArticle(id: string) {
    const filter = this.article.data.filter(x => x.id == id)
    if (!filter.length) {
      return
    }
    this.title = filter[0].title
    this.content = filter[0].content
    this.content && this.editorMdDirective.setContent(this.content)
    this.articleID = id
  }

  // 删除专题
  delProject(e: DeleteEventArgs) {
    if (!(e.data instanceof Object) || !e.data.value) {
      return
    }
    //TODO::删除专题
  }

  changeStatus(id: string, status: boolean) {
    this.ejDialog.content = "确认要更改状态吗？"
    this.ejDialog.show()
    this.ejDialog.buttons = [{
      click: () => this.articleService.updateStatus(id, status).subscribe(x => {
        this.ejDialog.hide()
        if (!x) return
        this.toast.success("状态变更成功", "修改状态提醒")
        this.article = {
          ...this.article,
          data: this.article.data.map(item => <ArticleItem>(item.id == id ? {...item, status: status} : item))
        }

      }), buttonModel: {content: '确定', isPrimary: true}
    }, {click: () => this.ejDialog.hide(), buttonModel: {content: '取消'}}];
  }

  del(id: string) {
    this.ejDialog.content = "确认要删除该文章吗？"
    this.ejDialog.show()
    this.ejDialog.buttons = [{
      click: () => this.articleService.del(id).subscribe(x => {
        this.ejDialog.hide()
        if (!x) return
        this.toast.success("文章删除成功", "删除提醒")
        this.article = {
          ...this.article,
          data: this.article.data.filter(item => item.id != id)
        }
      }), buttonModel: {content: '确定', isPrimary: true}
    }, {click: () => this.ejDialog.hide(), buttonModel: {content: '取消'}}];
  }
}
