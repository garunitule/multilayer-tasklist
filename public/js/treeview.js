// グローバル変数を宣言
// 描画用のデータ準備
let width = document.querySelector("svg").clientWidth;
let height = document.querySelector("svg").clientHeight;

// ノードのサイズや間隔の情報
//位置やサイズ情報
const rectSize = {
    height: 40,
    width: 200
};

const basicSpace = {
    padding: 30,
    height: 60,
    width: 260
};


// 描画用のデータ変換
const changeData(data) {
    let root = d3.hierarchy(data);
    let tree = d3.tree()
        .size([height, width-160]);
    tree(root);
    //各ノードが持つ末端ノードの数を付与
    root.count();
    return root;
};

//x座標(表示ではy)の計算
const defineX = (wholeData, eachData, spaceInfo) => {
    //最上位から現在のデータまでの最短ルートを取得
    const path = wholeData.path(eachData);
    //渡された元データがJSONのままなのでHierarchy形式に変換
    const wholeTree = wholeData.descendants();
    //経由する各ノードのある階層から、経由地点より上に位置する末端ノードの個数を合計
    const leaves = path.map((ancestor) => {
        //経由地点のある階層のうちで親が同じデータを抽出
        const myHierarchy = wholeTree.filter((item, idx, ary) => item.depth === ancestor.depth && item.parent === ancestor.parent);
        //その階層における経由地点のインデックス取得
        let myIdx = myHierarchy.findIndex((item) => item.data.name == ancestor.data.name);
        //経由地点より上にあるものをフィルタリング
        const fitered = myHierarchy.filter((hrcyItem, hrcyIdx, hrcyAry) => hrcyIdx < myIdx);
        //valueを集計（配列が空の時があるので、reduceの初期値に0を設定）
        const sumValues = fitered.reduce((previous, current, index, array) => previous + current.value, 0);
        return sumValues;
    });
    //末端ノードの数を合計
    const sum = leaves.reduce((previous, current, index, array) => previous + current);
    return sum;
};

//位置決め
const definePos(spaceInfo, data) => {
    let treeData = changeData(data);
    treeData.each((d) => {
        d.y = spaceInfo.padding + d.depth * spaceInfo.width;
        const sum = defineX(treeData, d, spaceInfo);
        d.x = spaceInfo.padding + sum * spaceInfo.height;
    });

    return treeData;
};

//選択されたノードに対応するdataのindexを返す関数
const getObjectPath = (e) => {
    const n = e.depth+1;//子から遡る回数
    let path = [];
    let currentNode = e;

    //配列としてパスを取得する
    for(let i=0;i<n-1;i++) {
        let currentName = currentNode.data.name;
        path.unshift(currentName); //配列の先頭に要素を追加
        currentNode = currentNode.parent;//１つ親ノードに遡る
    }

    const pathLen = path.length;
    let currentChildren = data.children;
    let ind = [];

    //全階層を探索する
    for(let i=0;i<pathLen;i++){

        // 各階層を探索する
        for(let j=0;j<currentChildren.length;j++){
            //pathと同じ名前があれば、その指標を記録
            if (currentChildren[j].name === path[i]) {
                ind.push(j);
            }
        }

        // 次の階層に移動
        currentChildren = currentChildren[ind[i]].children;
    }
    return ind;
};

const dataTotask = (name, tasks) => {
    const n = tasks.length;
    for(let i=0;i<n;i++) {
        let content = tasks[i].content;
        if (name == content) {
            return tasks[i];
        }
    }
};

// 各CRUD操作でdataの変更処理をするのに必要なデータを用意する関数
const prepareChangeData = (e) => {
    // 現在選択したtaskを取得
    let tasks = document.getElementById('js-getTasks').getAttribute('data-task');
    tasks = JSON.parse(tasks);
    const name = e.data.name;
    const task = dataTotask(name, tasks);
    console.log("tasks",tasks);
    console.log("name",name);
    console.log("task",task);

    // indを取得する
    const id = task.id;
    const parentIdList = createParentIdList(tasks);
    const dataTree = createDataTree(tasks, parentIdList);
    const depthObject = createDepthObject(tasks);
    const ind = getPathInd(tasks,dataTree, depthObject, id);

    console.log("id", id);
    console.log("dataTree", dataTree);
    console.log("depthObject", depthObject);
    console.log("ind",ind);

    const temp = {
        ind: ind,
        task: task,
        tasks: tasks,
    };

    return temp;
};

// ajaxでstoreメソッドを実行する関数
const ajaxStore(taskTemp, data){
    // AjaxでTasksControllerのstoreメソッドを呼ぶ
    $.ajax({
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        },
        url: 'ajax',
        type: 'POST',
        data: {'task':taskTemp, '_method': 'POST', status:"create"},
    })
    // Ajaxリクエストが成功した場合
    .done(function(data) {
        console.log("ind success");
        let temp = JSON.stringify(data);
        console.log("data",data);
        console.log("data-task", temp);
        document.getElementById("js-getTasks").setAttribute('data-task', temp);
        window.location.reload(true);
    })
    // Ajaxリクエストが失敗した場合
    .fail(function(data) {
        console.log("add error");
        alert(data.responseJSON);
    });
};


//dataに要素を追加する関数
//サーバーにもデータを登録する関数
const AddData(e, data){
    const temp = prepareChangeData(e);
    const task = temp.task;
    const ind = temp.ind;

    const n = ind.length;
    let currentData = data; //dataはグローバル変数

    // 最初はプロジェクトノードを示し、必ず0なので無視する
    for(let i=1;i<n;i++){
        currentData = currentData.children[ind[i]];
    }

    //dataにノードを追加
    //直接dataにアクセスできないので、currentDataからアクセス
    const content = "node"+Math.floor((Math.random()*100000));
    if ('children' in currentData) {
        currentData.children.push({"name": content});
    } else {
        currentData['children'] = [{"name": content}];
    }

    console.log("temp",temp);

    // サーバーに渡すオブジェクト
    const taskTemp = {
                        project_id: task.project_id,
                        content:content,
                        parent_id:task.id,
                        project_flag : 0,
                        selected : 0
    };

    // ajaxでサーバーに登録
    ajaxStore(taskTemp, data);

};

// ajaxでdeleteメソッドを実行する関数
const ajaxDelete(id,project_id,data){
    // AjaxでTasksControllerのstoreメソッドを呼ぶ
    $.ajax({
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        },
        url: 'ajax',
        type: 'POST',
        data: {'id':id, 'project_id':project_id, '_method': 'POST', status:"delete"},
    })
    // Ajaxリクエストが成功した場合
    .done(function(data) {
        console.log("success delete");
        let temp = JSON.stringify(data);
        console.log("temp",temp);
        document.getElementById("js-getTasks").setAttribute('data-task', temp);
        window.location.reload(true);
    })
    // Ajaxリクエストが失敗した場合
    .fail(function(data) {
        alert(data.responseJSON);
    });
};


const DeleteData(e,data){
    const temp = prepareChangeData(e);
    const id = temp.task.id;
    const project_id = temp.task.project_id;
    const ind = temp.ind;

    let n = ind.length;
    let currentData = data; //dataはグローバル変数

    // 最初はプロジェクトノードを示し、必ず0なので無視する
    // 選択したノードが格納されている配列を取得する
    let l = 0;
    for(let i=1;i<n;i++){
        if (i == n-1) {
            // 同階層に存在するタスクの数
            l = currentData.children.length;

            if (l != 1) {
                // 同階層に複数タスクが存在する場合は、そのタスクが存在する配列を返す
                // １つしかない場合は、親タスクのオブジェクトを返す
                currentData = currentData.children;
            }
        } else {
            currentData = currentData.children[ind[i]];
        }
    }

    console.log("id",id);
    console.log("ind", ind);
    console.log("currentData before delete",currentData);

    // dataからタスクを削除
    if (l == 1) {
        // currentDataは親タスクのオブジェクト
        delete currentData.children;
    } else {
        // currentDataは選択されたタスクが含まれる配列
        // currentIndは削除対象のタスクのindex
        let currentInd = ind.slice(-1)[0];

        currentData.splice(currentInd,1);
    }

    console.log("currentData after delete", currentData);

    ajaxDelete(id, project_id, data);

};

const ajaxUpdate(id, content, project_id,data){
    // AjaxでTasksControllerのajaxCRUDメソッドを呼ぶ
    $.ajax({
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        },
        url: 'ajax',
        type: 'POST',
        data: {
                'id':id,
                'content':content,
                'project_id':project_id,
                '_method': 'POST',
                status:"update"
        },
    })
    // Ajaxリクエストが成功した場合
    .done(function(data) {
        console.log("success update");
        let temp = JSON.stringify(data);
        console.log("temp",temp);
        document.getElementById("js-getTasks").setAttribute('data-task', temp);
        window.location.reload(true);
    })
    // Ajaxリクエストが失敗した場合
    .fail(function(data) {
        alert(data.responseJSON);
    });
};

const getLen = (str) => {
  var result = 0;
  for(var i=0;i<str.length;i++){
    var chr = str.charCodeAt(i);
    if((chr >= 0x00 && chr < 0x81) ||
       (chr === 0xf8f0) ||
       (chr >= 0xff61 && chr < 0xffa0) ||
       (chr >= 0xf8f1 && chr < 0xf8f4)){
      //半角文字の場合は1を加算
      result += 1;
    }else{
      //それ以外の文字の場合は2を加算
      result += 2;
    }
  }
  //結果を返す
  return result;
};

const UpdateData(e,data){
    const temp = prepareChangeData(e);
    const id = temp.task.id;
    const ind = temp.ind;
    const project_id = temp.task.project_id;

    let n = ind.length;
    let currentData = data; //dataはグローバル変数

    console.log("ind",ind);
    console.log("n",n);

    // 選択したタスクオブジェクトを取得する
    for(let i=1;i<n;i++){
        currentData = currentData.children[ind[i]];
    }

    // メニューに入力されたタスク名を取得
    const content = $('.dropdwn_menu input').val();

    // メニューに入力されている場合
    if (content != "") {
        // 入力内容が24文字以内の場合
        if (getLen(content) < 24) {
            // dataのタスク名を変更
            currentData.name = content;
            $('.dropdwn_menu input').val("");
            // サーバに変更をpost
            // data-task属性も変更
            ajaxUpdate(id, content, project_id,data);
        // 入力内容が20文字を超えている場合
        } else {
            alert("タスク名は全角12文字以内、半角24文字以内にしてください");
        }

    // メニューに何も入力されていない場合
    } else {
        alert("タスク名を入力してください");
    }

};

const ajaxChangeSelected(id, project_id,data){
    // AjaxでTasksControllerのajaxCRUDメソッドを呼ぶ
    $.ajax({
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        },
        url: 'ajax',
        type: 'POST',
        data: {
                'id':id,
                'project_id':project_id,
                '_method': 'POST',
                status:"select"
        },
    })
    // Ajaxリクエストが成功した場合
    .done(function(data) {
        console.log("success change Selected");
        let temp = JSON.stringify(data);
        console.log("temp",temp);
        document.getElementById("js-getTasks").setAttribute('data-task', temp);
        window.location.reload(true);
    })
    // Ajaxリクエストが失敗した場合
    .fail(function(data) {
        alert(data.responseJSON);
    });
};

const changeSelected(e,data){
    const temp = prepareChangeData(e);
    const id = temp.task.id;
    const project_id = temp.task.project_id;

    ajaxChangeSelected(id, project_id,data);

};


// ドロップダウンメニューのスタイルを変更
const styleDropdwn = (e) => {
    // e : D3.jsのイベントオブジェクト
    // menuの操作を決定する
    $('.dropdwn li').hover(function(){
        $("ul:not(:animated)", this).slideDown();
    }, function(){
        $("ul.dropdwn_menu",this).slideUp();
    });


    // dropdwnメニューのスタイルを決定
    $('.dropdwn').css("width", rectSize.width);
    const pos = $('svg').offset();
    let top = pos.top + e.x + rectSize.height;
    let left = pos.left + e.y;
    $('#menu').css("top", top)
              .css("left", left);

    // updateのためのinputタグのスタイルを整える
    let inputWidth = rectSize.width-10;
    inputWidth = String(inputWidth) + "px";
    console.log("inputWidth",inputWidth);
    $('.dropdwn_menu input').css("width", inputWidth);

    // inputタグの値に選択されたタスク名を入れる
    const content = e.data.name;
    const result = content.indexOf("node");
    // 初回の編集の場合はinputに何も代入しない
    // 二回目以降の編集はinputにノードの名前を代入する
    // nodeが入っていなかった場合
    if (result == -1) {
        $('.dropdwn_menu input').val(content);
    // nodeが入っていた場合
    } else {
        $('.dropdwn_menu input').val("");
    }

};

//ドロップダウンメニューにイベントを登録
// 再読みこみしないとメニューを開いたまま固まるエラーが発生している
// なのでlocation.reload()によりページを再読み込みしている
const EventDropdwn(event,data){
    // eventはタスクをクリックした時のイベントオブジェクト(D3.js)
    $('#addTask').off('click');
    $('#addTask').on('click',(e)=>{
        // aタグのページ遷移を無効化
        e.preventDefault();
        // 編集結果をフロントエンド, バックエンド、両者に反映
        // フロントエンドはキャッシュ(data)を変更
        // バックエンドはサーバーにajaxでアクセスして変更
        // data-taskも変更
        AddData(event, data);
        // メニューを隠す
        $('.dropdwn').hide();
        changeTree();
        // ページを再読み込み
        // window.location.reload(false);
    });

    $('#deleteTask').off('click');
    $('#deleteTask').on('click',(e)=>{
        // aタグのページ遷移を無効化
        e.preventDefault();

        // 子タスクが存在するか確認
        // 選択されたtaskに子タスクが存在すればtrue
        let flag = false;
        let tasks = document.getElementById('js-getTasks').getAttribute('data-task');
        tasks = JSON.parse(tasks);
        const name = event.data.name;
        let task = getTaskByName(tasks,name);
        for(let i=0;i<tasks.length;i++){
            if (task.id == tasks[i].parent_id) {
                flag = true;
            }
        }

        // 末端taskのみ削除許可
        if (flag) {
            alert("末端のタスクのみ削除可能です。このタスクを削除する前に、子タスクも削除してください。");
            // メニューを隠す
            $('.dropdwn').hide();
        } else {
            // 編集結果をフロントエンド, バックエンド、両者に反映
            // フロントエンドはキャッシュ(data)を変更
            // バックエンドはサーバーにajaxでアクセスして変更
            DeleteData(event,data);
            // メニューを隠す
            $('.dropdwn').hide();
            changeTree();
        }

    });

    $('#updateTask').off('click');
    $('#updateTask').on('click',(e)=>{
        // aタグのページ遷移を無効化
        e.preventDefault();
        // 編集結果をフロントエンド, バックエンド、両者に反映
        // フロントエンドはキャッシュ(data)を変更
        // バックエンドはサーバーにajaxでアクセスして変更
        UpdateData(event,data);
        // メニューを隠す
        $('.dropdwn').hide();
        // 表示を変更する
        changeTree();
        // ページを再読み込み
        // window.location.reload(false);
    });

    $('#changeTask').off('click');
    $('#changeTask').on('click',(e)=>{
        // aタグのページ遷移を無効化
        e.preventDefault();
        // 編集結果をフロントエンド, バックエンド、両者に反映
        // フロントエンドはキャッシュ(data)を変更
        // バックエンドはサーバーにajaxでアクセスして変更
        changeSelected(event,data);
        // メニューを隠す
        $('.dropdwn').hide();
        // 表示を変更する
        changeTree();
        // ページを再読み込み
        // window.location.reload(false);
    });

};

// nodeにノード追加イベントを追加する関数
// showTreeから呼ばれる
const AddEvent(node,data){
    node
        .attr('cursor', 'pointer')
        .on('click', function(e) {// d3.jsの関数であることに注意
            console.log("node name",e.data.name);

            // dropdwnメニューの表示を整える
            styleDropdwn(e);

            // dropdwnメニューにCRUD処理を登録
            EventDropdwn(e,data);

            $('.dropdwn').toggle();

            console.log("data",data);

        });
};


// 選択された(checkboxにチェックがつけられた)taskのスタイルを変更する
// data, tasks間に齟齬があるとエラーを吐く
// 新しいtaskがtasksに存在しないから
// エラーを吐くが、処理に影響はないので無視
const selectedStyle = () => {
    // スタイルの変更
    d3.selectAll("g").select("rect").classed("selected",
        (d)=>{
            let name = d.data.name;
            let tasks = document.getElementById('js-getTasks').getAttribute('data-task');
            tasks = JSON.parse(tasks);
            let task = getTaskByName(tasks,name);
            return task.selected;
        }
    );
};

// ノード間を結ぶ線を作る関数
const createLink(data){
    let root = changeData(data);
    root = definePos(basicSpace, data);

    let g = d3.select("svg").append("g");
    let link = g.selectAll(".link")
        .data(root.descendants().slice(1))
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("d", function (d) {
            return "M" + d.y + "," + d.x +
                "L" + (d.parent.y + rectSize.width + (basicSpace.width - rectSize.width) / 2) + "," + d.x +
                " " + (d.parent.y + rectSize.width + (basicSpace.width - rectSize.width) / 2) + "," + d.parent.x +
                " " + (d.parent.y + rectSize.width) + "," + d.parent.x
        })
        .attr("transform", function (d) { return "translate(0," + rectSize.height / 2 + ")"; });

    const temp = {
        g: g,
        root:root
    };

    return  temp;
};


// ノードを作る関数
const createNode(temp,data){
    let root = temp.root;
    let g = temp.g;

    let node = g.selectAll(".node")
        .data(root.descendants())
        .enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", function (d) { return "translate(" + d.y + "," + d.x + ")"; })
        .attr("data-name", function (d) { return d.data.name; }); // 追加

    node.append("rect")
        .attr("width", rectSize.width)
        .attr("height", rectSize.height)
        .attr("class", "rect");

    node.append("text")
        .text(function (d) { return d.data.name; })
        .attr("transform", "translate(" + 10 + "," + 15 + ")");

    AddEvent(node,data);
};

// dataに応じてツリーの表示を変更する関数
const changeTree(){
    // DBのデータを格納したタグがあるので、そこからtasksを取得する
    let tasks = $('#js-getTasks').data().task;
    let data = createData(tasks);
    //今までの表示を削除
    $('svg > g').remove();

    // ノードを結ぶ線を作成
    let temp = createLink(data);

    // ノードを作成
    createNode(temp,data);

    selectedStyle();

};

const showTree(){
    // DBのデータを格納したタグがあるので、そこからtasksを取得する
    let tasks = $('#js-getTasks').data().task;
    let data = createData(tasks);
    // Nodeを結ぶLinkの作成
    let temp = createLink(data);

    // Nodeを作成
    createNode(temp,data);

    selectedStyle();

    // 変更が反映されるのか検証
    console.log("success load!!");
};

// mainの処理
// data作成
let start = performance.now();
let end = performance.now();
let time = "calc time: " + (end - start) + "ms";
console.log(time);

// dataを表示
// ノードを追加するイベントハンドラも登録している
showTree();
