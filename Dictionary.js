class Dictionary {//字典类

    constructor(object) {
        this.items = object || {};//存储在一个Object的实例中
    }

    has(key){//验证一个key是否是items对象的一个属性
        return key in this.items;
    };
    set(key,value){//设置属性
        this.items[key]=value;
    };
    remove(key){//移除key属性
        if(this.has(key)){
            delete this.items[key];
            return true;
        }
        return false;
    };
    get(key){//查找特定属性
        return this.has(key) ? this.items[key]:undefined;
    };
    values(){//返回所有value实例的值
        var values=new Array();//存到数组中返回
        for(var k in this.items){
            if(this.has(k)){
                values.push(this.items[k]);
            }
        }
        return values;
    };
    getItems(){//获取
        return this.items;
    };
    clear() {//清除
        this.items = {};
    };
    size() {//获取属性的多少
        return Object.keys(this.items).length;
    };
}

module.exports = Dictionary;